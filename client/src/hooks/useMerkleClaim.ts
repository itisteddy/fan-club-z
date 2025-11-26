import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { BaseError, type Hash } from 'viem';
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { waitForTransactionReceipt } from 'viem/actions';
import toast from 'react-hot-toast';
import { ESCROW_MERKLE_ABI } from '@/chain/escrowMerkleAbi';
import { useWalletConnectSession } from '@/hooks/useWalletConnectSession';
import { useAuthStore } from '@/store/authStore';
import { invalidateAfterClaim } from '@/utils/queryInvalidation';
import { 
  logTransaction, 
  parseOnchainError, 
  isSessionError,
  cleanupWalletConnectStorage,
  broadcastReconnectRequired,
  broadcastBalanceRefresh,
  isUserRejection,
  ensureWalletReady,
} from '@/services/onchainTransactionService';
import { useWeb3Recovery } from '@/providers/Web3Provider';

function toBytes32FromUuid(uuid: string): `0x${string}` {
  const hex = uuid.replace(/-/g, '').toLowerCase().padEnd(64, '0');
  return `0x${hex}` as const;
}

// Convert USDC units to USD
function usdcUnitsToUSD(units: bigint): number {
  return Number(units) / 1_000_000;
}

export function useMerkleClaim() {
  const { address, chainId, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const { withSessionRecovery, recoverFromError, cleanupWalletConnectSessions } = useWalletConnectSession();
  const queryClient = useQueryClient();
  const { sessionHealthy } = useWeb3Recovery();

  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle session errors with recovery
   */
  async function handleSessionErrorRecovery(err: unknown): Promise<boolean> {
    if (!isSessionError(err)) {
      return false;
    }
    
    console.log('[FCZ-CLAIM] Detected stale WalletConnect session, attempting recovery...');
    
    try {
      cleanupWalletConnectStorage();
      await recoverFromError({ attemptReconnect: true });
      toast.error('Wallet session expired. Please reconnect and try again.', { id: 'session-error' });
      broadcastReconnectRequired('Wallet session expired');
      return true;
    } catch (recoveryErr) {
      console.error('[FCZ-CLAIM] Session recovery failed:', recoveryErr);
      cleanupWalletConnectStorage();
      await cleanupWalletConnectSessions();
      toast.error('Wallet connection lost. Please reconnect.', { id: 'session-error' });
      return true;
    }
  }

  const claim = useCallback(
    async (args: {
      predictionId: string;
      escrowAddress?: `0x${string}`;
      amountUnits: bigint;
      proof: `0x${string}`[];
    }): Promise<`0x${string}` | null> => {
      setIsClaiming(true);
      setError(null);

      if (!address || !isConnected) {
        toast.error('Connect your wallet to claim.');
        setIsClaiming(false);
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
        toast.error(parsed.message, { id: 'claim' });
        setError(parsed.message);
        setIsClaiming(false);
        return null;
      }
      
      let txHash: Hash | null = null;
      const amountUSD = usdcUnitsToUSD(args.amountUnits);
      const userId = useAuthStore.getState().user?.id || '';
      
      try {
        if (!isConnected || !address) {
          toast.error('Connect wallet to claim');
          return null;
        }
        if (chainId !== baseSepolia.id) {
          await switchChainAsync({ chainId: baseSepolia.id });
        }

        const escrowAddress =
          args.escrowAddress ||
          (import.meta.env.VITE_BASE_ESCROW_ADDRESS as `0x${string}`) ||
          (import.meta.env.VITE_ESCROW_CONTRACT_ADDRESS as `0x${string}`);
        if (!escrowAddress) {
          throw new Error('Escrow contract address missing (VITE_BASE_ESCROW_ADDRESS)');
        }

        const predictionIdHex = toBytes32FromUuid(args.predictionId);

        console.log('[FCZ-CLAIM] Submitting claim:', {
          predictionId: args.predictionId,
          amount: amountUSD,
          proofLength: args.proof.length,
        });

        toast.loading('Submitting claim...', { id: 'claim' });
        
        // Execute with session recovery wrapper
        try {
          txHash = await withSessionRecovery(async () => {
            return await writeContractAsync({
              address: escrowAddress,
              abi: ESCROW_MERKLE_ABI,
              functionName: 'claim',
              args: [predictionIdHex, args.amountUnits, args.proof],
            } as any);
          }, { maxRetries: 1, showToast: false, operationTimeoutMs: 20000 }) as Hash;
        } catch (writeErr) {
          // Check for user rejection first
          if (isUserRejection(writeErr)) {
            toast.dismiss('claim');
            throw new Error('Transaction cancelled by user');
          }
          
          // Check for session errors
          const wasSessionError = await handleSessionErrorRecovery(writeErr);
          if (wasSessionError) {
            throw new Error('Wallet session expired. Please reconnect and try again.');
          }
          
          throw writeErr;
        }

        if (!txHash) {
          throw new Error('Missing transaction hash after claim submission');
        }

        console.log('[FCZ-CLAIM] Claim tx sent:', txHash);

        // Log claim as pending
        if (userId) {
          await logTransaction({
            userId,
            walletAddress: address,
            txHash,
            type: 'claim',
            status: 'pending',
            amount: amountUSD,
            predictionId: args.predictionId,
          }).catch(e => console.warn('[FCZ-CLAIM] Log failed:', e));
        }

        // Persist tx hash for later reference
        try {
          const key = `fcz:lastTx:claim:${args.predictionId}:${address.toLowerCase()}`;
          localStorage.setItem(key, txHash);
          window.dispatchEvent(new CustomEvent('fcz:tx', { 
            detail: { kind: 'claim', txHash, predictionId: args.predictionId } 
          }));
        } catch {}

        toast.loading('Waiting for confirmation...', { id: 'claim' });

        // Wait for receipt
        let receiptSuccess = true;
        if (publicClient) {
          try {
            const receipt = await waitForTransactionReceipt(publicClient as any, { 
              hash: txHash,
              confirmations: 1,
              timeout: 180_000,
            });
            
            if (receipt.status === 'reverted') {
              receiptSuccess = false;
              toast.error('Claim reverted — settlement root not posted yet or invalid proof', { id: 'claim' });
            }
          } catch (receiptErr) {
            console.warn('[FCZ-CLAIM] Receipt wait failed:', receiptErr);
          }
        }

        // If receipt failed, return early
        if (!receiptSuccess) {
          // Log claim as failed
          if (userId) {
            await logTransaction({
              userId,
              walletAddress: address,
              txHash,
              type: 'claim',
              status: 'failed',
              amount: amountUSD,
              predictionId: args.predictionId,
              error: 'Transaction reverted on-chain',
            }).catch(e => console.warn('[FCZ-CLAIM] Log failed:', e));
          }
          return txHash as `0x${string}`;
        }

        console.log('[FCZ-CLAIM] ✓ Claim confirmed:', txHash);

        // Log claim as completed
        if (userId) {
          await logTransaction({
            userId,
            walletAddress: address,
            txHash,
            type: 'claim',
            status: 'completed',
            amount: amountUSD,
            predictionId: args.predictionId,
          }).catch(e => console.warn('[FCZ-CLAIM] Log failed:', e));
        }

        // Inspect receipt logs for Transfer to user
        try {
          if (publicClient && address) {
            const receipt = await (publicClient as any).getTransactionReceipt({ hash: txHash });
            const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
            const userTopic = `0x000000000000000000000000${address.toLowerCase().slice(2)}`;
            const hasTransferToUser = (receipt?.logs || []).some((log: any) => 
              Array.isArray(log.topics) && 
              log.topics.length >= 3 && 
              log.topics[0] === TRANSFER_TOPIC && 
              log.topics[2]?.toLowerCase() === userTopic
            );
            
            const short = `${txHash.slice(0, 8)}…${txHash.slice(-6)}`;
            if (!hasTransferToUser) {
              toast('Claim mined, but no ERC20 transfer detected. View tx: ' + short, { id: 'claim' });
            } else {
              toast.success('Claim successful! Tx: ' + short, { id: 'claim' });
            }
          } else {
            const short = `${txHash.slice(0, 8)}…${txHash.slice(-6)}`;
            toast.success('Claim successful! Tx: ' + short, { id: 'claim' });
          }
        } catch {
          const short = `${txHash.slice(0, 8)}…${txHash.slice(-6)}`;
          toast.success('Claim successful! Tx: ' + short, { id: 'claim' });
        }
        
        // Mark as claimed locally
        try {
          const addrLower = address.toLowerCase();
          localStorage.setItem(`fcz:claimed:${args.predictionId}:${addrLower}`, '1');
        } catch {}

        // PERFORMANCE FIX: Reconcile wallet balance with backend (non-blocking)
        // Don't await - let it happen in background
        if (userId && address) {
          fetch('/api/wallet/reconcile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              walletAddress: address,
              txHash,
            }),
          })
            .then(() => {
              console.log('[FCZ-CLAIM] Wallet reconciled with backend');
            })
            .catch((reconcileError) => {
              console.warn('[FCZ-CLAIM] Reconcile after claim failed:', reconcileError);
            });
        }
        
        // PERFORMANCE FIX: Invalidate queries (non-blocking, debounced)
        invalidateAfterClaim(queryClient, {
          userId,
          predictionId: args.predictionId,
        });
        
        // PERFORMANCE FIX: Trigger global balance refresh (debounced)
        // This is now debounced in setupBalanceRefreshListener
        broadcastBalanceRefresh();
        
        return txHash as `0x${string}`;
      } catch (e: any) {
        console.error('[FCZ-CLAIM] Claim failed:', e);
        
        // Check for session errors
        const wasSessionError = await handleSessionErrorRecovery(e);
        
        let msg = e?.shortMessage || e?.message || 'Claim failed';
        let markAsClaimed = false;
        
        if (e instanceof BaseError) {
          const lower = (e.shortMessage || '').toLowerCase();
          if (lower.includes('insufficient')) msg = 'Insufficient funds to pay gas';
          if (lower.includes('user rejected')) msg = 'User rejected the transaction';
          if (lower.includes('already claimed') || lower.includes('duplicate')) {
            msg = 'Already claimed';
            markAsClaimed = true;
          }
          if (lower.includes('execution reverted')) {
            msg = 'Claim reverted — already claimed or invalid proof';
          }
        }
        
        // Parse error for better message
        const parsed = parseOnchainError(e);
        if (parsed.code !== 'UNKNOWN_ERROR') {
          msg = parsed.message;
        }
        
        // Log failure if we had a tx hash
        if (txHash && userId && !wasSessionError && !markAsClaimed) {
          await logTransaction({
            userId,
            walletAddress: address!,
            txHash,
            type: 'claim',
            status: 'failed',
            amount: amountUSD,
            predictionId: args.predictionId,
            error: msg,
          }).catch(err => console.warn('[FCZ-CLAIM] Log failed:', err));
        }
        
        if (markAsClaimed) {
          try {
            const addrLower = address?.toLowerCase() || '';
            if (addrLower) {
              localStorage.setItem(`fcz:claimed:${args.predictionId}:${addrLower}`, '1');
            }
          } catch {}
          invalidateAfterClaim(queryClient, {
            userId,
            predictionId: args.predictionId,
          });
          toast.success('Already claimed', { id: 'claim' });
          return null;
        } else if (!wasSessionError) {
          setError(msg);
          toast.error(msg, { id: 'claim' });
          return null;
        } else {
          return null;
        }
      } finally {
        setIsClaiming(false);
      }
    },
    [address, chainId, isConnected, publicClient, switchChainAsync, writeContractAsync, queryClient, withSessionRecovery, recoverFromError, cleanupWalletConnectSessions, sessionHealthy]
  );

  return {
    isClaiming,
    error,
    claim,
  };
}

export default useMerkleClaim;
