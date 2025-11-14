import { useCallback, useState } from 'react';
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { waitForTransactionReceipt } from 'viem/actions';
import { BaseError } from 'viem';
import { getAddress } from 'viem';
import toast from 'react-hot-toast';
import { getApiUrl } from '@/utils/environment';
import { ESCROW_MERKLE_ABI } from '@/chain/escrowMerkleAbi';

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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      try {
        if (!isConnected || !address) {
          toast.error('Connect wallet as the creator');
          return null;
        }
        if (chainId !== baseSepolia.id) {
          await switchChainAsync({ chainId: baseSepolia.id });
        }

        // Load creator’s registered wallet address to confirm identity
        const summaryRes = await fetch(`${getApiUrl()}/api/wallet/summary/${args.userId}`);
        const summary = await summaryRes.json().catch(() => ({}));
        const creatorAddress = summary?.walletAddress ? (getAddress(summary.walletAddress) as `0x${string}`) : null;
        if (!creatorAddress) {
          toast.error('Creator wallet address not found. Link your wallet first.');
          return null;
        }
        if (creatorAddress.toLowerCase() !== address.toLowerCase()) {
          toast.error('Please connect the creator wallet to submit settlement');
          return null;
        }

        // Prepare merkle distribution on the server
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

        toast.loading('Submitting settlement root on-chain...', { id: 'settle' });
        const txHash = await writeContractAsync({
          address: escrowAddress,
          abi: ESCROW_MERKLE_ABI,
          functionName: 'postSettlementRoot',
          args: [predictionIdHex, root, creatorAddress, creatorFee, platformAddress, platformFee],
        } as any);

        if (publicClient) {
          await waitForTransactionReceipt(publicClient as any, { hash: txHash });
        }
        try {
          const key = `fcz:lastTx:settlement:${args.predictionId}`;
          localStorage.setItem(key, txHash);
          window.dispatchEvent(new CustomEvent('fcz:tx', { detail: { kind: 'settlement', txHash, predictionId: args.predictionId } }));
        } catch {}

        // Notify backend that on-chain posting is complete (for audit/status)
        try {
          await fetch(`${getApiUrl()}/api/v2/settlement/manual/merkle/posted`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ predictionId: args.predictionId, txHash, root }),
          });
        } catch {}
        const short = `${txHash.slice(0, 8)}…${txHash.slice(-6)}`;
        toast.success('Settlement root posted! Tx: ' + short, { id: 'settle' });
        // Hint the app to refresh predictions and claims
        try { window.dispatchEvent(new CustomEvent('fcz:balance:refresh')); } catch {}
        return { txHash: txHash as `0x${string}`, root };
      } catch (e: any) {
        let msg = e?.shortMessage || e?.message || 'Failed to submit settlement';
        if (e instanceof BaseError) {
          // Common error surfaces mapped for clarity
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
    [address, chainId, isConnected, publicClient, switchChainAsync, writeContractAsync]
  );

  return {
    isSubmitting,
    error,
    settleWithMerkle,
  };
}

export default useSettlementMerkle;


