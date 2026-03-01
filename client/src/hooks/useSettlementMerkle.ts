import { useCallback, useState } from 'react';
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { waitForTransactionReceipt } from 'viem/actions';
import { BaseError, type Hash } from 'viem';
import { getAddress } from 'viem';
import toast from 'react-hot-toast';
import { getApiUrl } from '@/utils/environment';
import { ESCROW_MERKLE_ABI } from '@/chain/escrowMerkleAbi';
import { useWalletConnectSession } from '@/hooks/useWalletConnectSession';
import { useWeb3Recovery } from '@/providers/Web3Provider';
import { 
  logTransaction, 
  parseOnchainError, 
  isSessionError,
  cleanupWalletConnectStorage,
  broadcastReconnectRequired,
  broadcastBalanceRefresh,
  ensureWalletReady,
} from '@/services/onchainTransactionService';

function toBytes32FromUuid(uuid: string): `0x${string}` {
  const hex = uuid.replace(/-/g, '').toLowerCase().padEnd(64, '0');
  return `0x${hex}` as const;
}

export type MerklePrepareResponse = {
  success: boolean;
  data: {
    predictionId: string;
    title: string;
    winningOptionId: string;
    merkleRoot: `0x${string}`;
    platformFeeUnits: string;
    creatorFeeUnits: string;
    leaves: Array<{
      user_id: string;
      address: `0x${string}`;
      amountUnits: string;
      leaf: `0x${string}`;
      proof: `0x${string}`[];
    }>;
    summary: {
      platformFeeUSD: number;
      creatorFeeUSD: number;
      payoutPoolUSD: number;
      prizePoolUSD: number;
      winnersCount: number;
    };
  };
  message: string;
  version: string;
};

export function useSettlementMerkle() {
  const { address, chainId, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const { withSessionRecovery, recoverFromError } = useWalletConnectSession();
  const { sessionHealthy } = useWeb3Recovery();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle session errors with recovery
   */
  async function handleSessionErrorRecovery(err: unknown): Promise<boolean> {
    if (!isSessionError(err)) {
      return false;
    }
    
    console.log('[FCZ-SETTLE] Detected stale WalletConnect session, attempting recovery...');
    
    try {
      cleanupWalletConnectStorage();
      await recoverFromError();
      toast.error('Wallet session expired. Please try again.', { id: 'session-error' });
      broadcastReconnectRequired('Wallet session expired');
      return true;
    } catch (recoveryErr) {
      console.error('[FCZ-SETTLE] Session recovery failed:', recoveryErr);
      cleanupWalletConnectStorage();
      toast.error('Wallet connection lost. Please reconnect.', { id: 'session-error' });
      return true;
    }
  }

  const settleWithMerkle = useCallback(
    async (args: {
      predictionId: string;
      winningOptionId: string;
      reason?: string;
      userId: string;
      escrowAddress?: `0x${string}`;
      platformTreasury?: `0x${string}`;
    }): Promise<{ txHash: `0x${string}`; root: `0x${string}` } | null> => {
      setIsSubmitting(true);
      setError(null);

      if (!address || !isConnected) {
        toast.error('Connect the creator wallet to settle this prediction.');
        setIsSubmitting(false);
        return null;
      }

      try {
        ensureWalletReady({
          address,
          chainId,
          expectedChainId: baseSepolia.id,
          isConnected,
          sessionHealthy,
        });
      } catch (err) {
        const parsed = parseOnchainError(err);
        toast.error(parsed.message);
        setError(parsed.message);
        setIsSubmitting(false);
        return null;
      }
      
      let txHash: Hash | null = null;
      
      try {
        if (!isConnected || !address) {
          toast.error('Connect wallet as the creator');
          return null;
        }
        if (chainId !== baseSepolia.id) {
          await switchChainAsync({ chainId: baseSepolia.id });
        }

        // NOTE: We trust the backend to verify creator identity via userId
        // The connected wallet will sign the on-chain settlement transaction
        // The backend /api/v2/settlement/manual/merkle endpoint validates:
        // 1. The userId matches the prediction creator
        // 2. The prediction exists and can be settled
        // We use the connected wallet for the on-chain tx, which is fine because:
        // - The creator pays gas for settlement
        // - The merkle root determines payouts, not the signer
        console.log('[FCZ-SETTLE] Using connected wallet for settlement:', address);

        // Prepare merkle distribution on the server
        console.log('[FCZ-SETTLE] Preparing merkle settlement for prediction:', args.predictionId);
        
        const prepare = await fetch(`${getApiUrl()}/api/v2/settlement/manual/merkle`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            predictionId: args.predictionId,
            winningOptionId: args.winningOptionId,
            userId: args.userId,
            reason: args.reason || '',
          }),
        });
        
        if (!prepare.ok) {
          const err = await prepare.json().catch(() => ({}));
          throw new Error(err?.message || 'Failed to prepare merkle settlement');
        }
        
        const data: MerklePrepareResponse = await prepare.json();

        const escrowAddress =
          args.escrowAddress ||
          (import.meta.env.VITE_BASE_ESCROW_ADDRESS as `0x${string}`) ||
          (import.meta.env.VITE_ESCROW_CONTRACT_ADDRESS as `0x${string}`);
        if (!escrowAddress) {
          throw new Error('Escrow contract address missing (VITE_BASE_ESCROW_ADDRESS)');
        }
        const platformAddress =
          args.platformTreasury ||
          (import.meta.env.VITE_PLATFORM_TREASURY_ADDRESS as `0x${string}`) ||
          ('0x0000000000000000000000000000000000000000' as `0x${string}`);

        const predictionIdHex = toBytes32FromUuid(args.predictionId);
        const root = data.data.merkleRoot as `0x${string}`;
        const creatorFee = BigInt(data.data.creatorFeeUnits);
        const platformFee = BigInt(data.data.platformFeeUnits);
        
        // Calculate total fee amount for logging (used for wallet_transactions)
        const totalFeeUSD =
          (data.data.summary?.platformFeeUSD ?? 0) +
          (data.data.summary?.creatorFeeUSD ?? 0);

        console.log('[FCZ-SETTLE] Submitting settlement root on-chain:', {
          predictionId: args.predictionId,
          root,
          creatorFee: creatorFee.toString(),
          platformFee: platformFee.toString(),
        });

        toast.loading('Submitting settlement root on-chain...', { id: 'settle' });
        
        // Execute with session recovery wrapper
        // Use connected wallet as creator fee recipient (they're paying for gas, they're the authenticated creator)
        txHash = await withSessionRecovery(async () => {
          return await writeContractAsync({
            address: escrowAddress,
            abi: ESCROW_MERKLE_ABI,
            functionName: 'postSettlementRoot',
            args: [predictionIdHex, root, address, creatorFee, platformAddress, platformFee],
          } as any);
        }, { maxRetries: 1, operationTimeoutMs: 20000 });

        if (!txHash) {
          throw new Error('Missing transaction hash after settlement submission');
        }

        console.log('[FCZ-SETTLE] Settlement tx sent:', txHash);

        // Log settlement as pending
        await logTransaction({
          userId: args.userId,
          walletAddress: address,
          txHash,
          type: 'settlement',
          status: 'pending',
          amount: totalFeeUSD,
          predictionId: args.predictionId,
        }).catch(e => console.warn('[FCZ-SETTLE] Log failed:', e));

        // Wait for receipt
        if (publicClient) {
          const receipt = await waitForTransactionReceipt(publicClient as any, { 
            hash: txHash,
            confirmations: 1,
            timeout: 180_000,
          });
          
          if (receipt.status === 'reverted') {
            throw new Error('Settlement transaction reverted on-chain');
          }
        }

        console.log('[FCZ-SETTLE] ✓ Settlement confirmed:', txHash);

        // Log settlement as completed
        await logTransaction({
          userId: args.userId,
          walletAddress: address,
          txHash,
          type: 'settlement',
          status: 'completed',
          amount: totalFeeUSD,
          predictionId: args.predictionId,
        }).catch(e => console.warn('[FCZ-SETTLE] Log failed:', e));

        // Store tx hash locally for reference
        try {
          const key = `fcz:lastTx:settlement:${args.predictionId}`;
          localStorage.setItem(key, txHash);
          window.dispatchEvent(new CustomEvent('fcz:tx', { 
            detail: { kind: 'settlement', txHash, predictionId: args.predictionId } 
          }));
        } catch {}

        // Notify backend that on-chain posting is complete
        try {
          await fetch(`${getApiUrl()}/api/v2/settlement/manual/merkle/posted`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ predictionId: args.predictionId, txHash, root }),
          });
        } catch {}
        
        const short = `${txHash.slice(0, 8)}…${txHash.slice(-6)}`;
        toast.success('Settlement root posted! Tx: ' + short, { id: 'settle' });
        
        // Trigger balance refresh
        broadcastBalanceRefresh();
        
        return { txHash: txHash as `0x${string}`, root };
      } catch (e: any) {
        console.error('[FCZ-SETTLE] Settlement failed:', e);
        
        // Check for session errors
        const wasSessionError = await handleSessionErrorRecovery(e);
        
        // Log failure if we had a tx hash
        if (txHash && !wasSessionError) {
          const parsed = parseOnchainError(e);
          await logTransaction({
            userId: args.userId,
            walletAddress: address!,
            txHash,
            type: 'settlement',
            status: 'failed',
            predictionId: args.predictionId,
            error: parsed.message,
          }).catch(err => console.warn('[FCZ-SETTLE] Log failed:', err));
        }
        
        let msg = e?.shortMessage || e?.message || 'Failed to submit settlement';
        if (e instanceof BaseError) {
          const lower = (e.shortMessage || '').toLowerCase();
          if (lower.includes('insufficient funds')) msg = 'Insufficient funds to pay gas';
          if (lower.includes('user rejected')) msg = 'User rejected the transaction';
          if (lower.includes('execution reverted')) msg = 'Contract reverted — check merkle root or fees';
        }
        
        setError(msg);
        toast.error(msg, { id: 'settle' });
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [address, chainId, isConnected, publicClient, sessionHealthy, switchChainAsync, writeContractAsync, withSessionRecovery, recoverFromError]
  );

  return {
    isSubmitting,
    error,
    settleWithMerkle,
  };
}

export default useSettlementMerkle;
