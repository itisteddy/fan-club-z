import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { BaseError } from 'viem';
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { waitForTransactionReceipt } from 'viem/actions';
import toast from 'react-hot-toast';
import { ESCROW_MERKLE_ABI } from '@/chain/escrowMerkleAbi';
import { getApiUrl } from '@/utils/environment';

function toBytes32FromUuid(uuid: string): `0x${string}` {
  const hex = uuid.replace(/-/g, '').toLowerCase().padEnd(64, '0');
  return `0x${hex}` as const;
}

export function useMerkleClaim() {
  const { address, chainId, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const queryClient = useQueryClient();

  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const claim = useCallback(
    async (args: {
      predictionId: string;
      escrowAddress?: `0x${string}`;
      amountUnits: bigint;
      proof: `0x${string}`[];
    }): Promise<`0x${string}` | null> => {
      setIsClaiming(true);
      setError(null);
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

        toast.loading('Submitting claim...', { id: 'claim' });
        const txHash = await writeContractAsync({
          address: escrowAddress,
          abi: ESCROW_MERKLE_ABI,
          functionName: 'claim',
          args: [predictionIdHex, args.amountUnits, args.proof],
        } as any);

        try {
          // Persist for later reference and broadcast to UI listeners
          const key = `fcz:lastTx:claim:${args.predictionId}:${(address || '').toLowerCase()}`;
          localStorage.setItem(key, txHash);
          window.dispatchEvent(new CustomEvent('fcz:tx', { detail: { kind: 'claim', txHash, predictionId: args.predictionId } }));
        } catch {}

        if (publicClient) {
          await waitForTransactionReceipt(publicClient as any, { hash: txHash });
        }

        // Inspect receipt logs for a Transfer to the user for diagnostics
        try {
          if (publicClient && address) {
            const receipt = await (publicClient as any).getTransactionReceipt({ hash: txHash });
            // If reverted, surface an explicit message and stop further checks
            if (receipt?.status && receipt.status !== 'success') {
              toast.error('Claim reverted — settlement root not posted yet or invalid proof', { id: 'claim' });
              return txHash as `0x${string}`;
            }
            const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'; // keccak256 Transfer(address,address,uint256)
            const userTopic = `0x000000000000000000000000${address.toLowerCase().slice(2)}`;
            const hasTransferToUser = (receipt?.logs || []).some((log: any) => Array.isArray(log.topics) && log.topics.length >= 3 && log.topics[0] === TRANSFER_TOPIC && log.topics[2]?.toLowerCase() === userTopic);
            if (!hasTransferToUser) {
              // No Transfer detected to user — surface a soft warning for visibility
              const short = `${txHash.slice(0, 8)}…${txHash.slice(-6)}`;
              toast('Claim mined, but no ERC20 transfer detected. View tx: ' + short, { id: 'claim' });
            } else {
              const short = `${txHash.slice(0, 8)}…${txHash.slice(-6)}`;
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
        // Persist a local claimed marker to improve UX without on-chain read
        try {
          const addrLower = (address || '').toLowerCase();
          if (addrLower) {
            localStorage.setItem(`fcz:claimed:${args.predictionId}:${addrLower}`, '1');
          }
        } catch {}
        // Invalidate proof and claimable lists so UI hides claim and banner updates
        queryClient.invalidateQueries({ queryKey: ['wallet', 'claimable'] });
        queryClient.invalidateQueries({ queryKey: ['prediction', args.predictionId, 'merkle-proof'] });
        // Trigger global balance refresh so wallet USDC/escrow update immediately
        try {
          window.dispatchEvent(new CustomEvent('fcz:balance:refresh'));
        } catch {}
        return txHash as `0x${string}`;
      } catch (e: any) {
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
        if (markAsClaimed) {
          try {
            const addrLower = (address || '').toLowerCase();
            if (addrLower) {
              localStorage.setItem(`fcz:claimed:${args.predictionId}:${addrLower}`, '1');
            }
          } catch {}
          // treat as non-fatal and refresh lists so CTA disappears
          queryClient.invalidateQueries({ queryKey: ['wallet', 'claimable'] });
          queryClient.invalidateQueries({ queryKey: ['prediction', args.predictionId, 'merkle-proof'] });
          toast.success('Already claimed', { id: 'claim' });
          return null;
        } else {
          setError(msg);
          toast.error(msg, { id: 'claim' });
          return null;
        }
      } finally {
        setIsClaiming(false);
      }
    },
    [address, chainId, isConnected, publicClient, switchChainAsync, writeContractAsync, queryClient]
  );

  return {
    isClaiming,
    error,
    claim,
  };
}

export default useMerkleClaim;


