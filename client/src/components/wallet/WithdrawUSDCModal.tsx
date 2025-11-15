import * as React from 'react';
import { useAccount, useWriteContract, usePublicClient, useSwitchChain } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { useQueryClient } from '@tanstack/react-query';
import { waitForTransactionReceipt } from 'viem/actions';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { QK } from '@/lib/queryKeys';
import { invalidateAfterWithdraw } from '@/utils/queryInvalidation';

const ESCROW_ADDR_ENV = (import.meta.env.VITE_BASE_ESCROW_ADDRESS ?? '') as `0x${string}`;
const ESCROW_ABI_MIN = [
  { type: 'function', name: 'withdraw', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [] },
] as const;

function usdToUsdcUnits(n: number): bigint {
  return BigInt(Math.round(n * 1_000_000));
}
function clamp2dp(v: number) { return Math.max(0, Math.floor(v * 100) / 100); }
function fmtUSD(n: number) { return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`; }

type WithdrawUSDCModalProps = {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  // how much of escrow is available to withdraw (escrow − reserved)
  availableUSDC?: number;
  userId?: string;
  escrowAddress?: `0x${string}`;
  escrowAbi?: any;
  title?: string;
  onSuccess?: () => void;
};

export default function WithdrawUSDCModal({
  open,
  isOpen: controlledOpen,
  onClose,
  availableUSDC = 0,
  userId = '',
  escrowAddress = ESCROW_ADDR_ENV,
  escrowAbi = ESCROW_ABI_MIN,
  title = 'Withdraw from Base',
  onSuccess,
}: WithdrawUSDCModalProps) {
  const queryClient = useQueryClient();
  const { address, chainId, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const [amount, setAmount] = React.useState<number>(0);
  const [submitting, setSubmitting] = React.useState(false);

  const isModalOpen = open ?? controlledOpen ?? false;

  React.useEffect(() => { if (!isModalOpen) setAmount(0); }, [isModalOpen]);

  React.useEffect(() => {
    if (!isModalOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !submitting && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isModalOpen, onClose, submitting]);

  if (!isModalOpen) return null;

  const cleanAmount = clamp2dp(amount || 0);
  const overLimit = cleanAmount > clamp2dp(availableUSDC);
  const isOnBase = chainId === baseSepolia.id;
  const disabled =
    !isConnected || !isOnBase || submitting || cleanAmount <= 0 || overLimit;

  async function ensureBase() {
    if (chainId !== baseSepolia.id) {
      await switchChainAsync({ chainId: baseSepolia.id });
    }
  }

  async function handleWithdraw() {
    try {
      setSubmitting(true);
      await ensureBase();
      const units = usdToUsdcUnits(cleanAmount);

      const txHash = await writeContractAsync({
        address: escrowAddress,
        abi: escrowAbi,
        functionName: 'withdraw',
        args: [units],
      } as any);

      if (publicClient) {
        await waitForTransactionReceipt(publicClient as any, { hash: txHash });
      }
      
      console.log(`[FCZ-PAY] ui: withdraw success`, txHash);
      
      // Show success toast with transaction hash
      const truncatedHash = `${txHash.slice(0, 6)}...${txHash.slice(-4)}`;
      toast.success(`Withdrew ${fmtUSD(cleanAmount)}! Tx: ${truncatedHash}`, {
        duration: 5000
      });

      // Invalidate all related queries using centralized utility
      const currentUserId = useAuthStore.getState().user?.id || userId;
      invalidateAfterWithdraw(queryClient, {
        userId: currentUserId,
        txHash: txHash,
      });

      onClose();
      onSuccess?.();
    } catch (err: any) {
      console.error('[withdraw] failed:', err);
      toast.error(err?.shortMessage ?? err?.message ?? 'Withdrawal failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-modal">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={submitting ? undefined : onClose}
      />
      <div 
        className="z-modal fixed inset-x-0 mx-auto w-full max-w-md rounded-t-2xl bg-white shadow-xl bottom-[calc(64px+env(safe-area-inset-bottom,0px))] max-h-[calc(100vh-env(safe-area-inset-top,0px)-64px-env(safe-area-inset-bottom,0px))] focus:outline-none"
      >
        <div className="mx-auto mt-2 mb-3 h-1.5 w-16 rounded-full bg-gray-200" />
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              aria-label="Close"
              onClick={onClose}
              className="rounded-full p-2 hover:bg-gray-100"
              disabled={submitting}
            >
              ✕
            </button>
          </div>
          <div className="mt-1 text-xs text-gray-500">
            Wallet: {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : 'Not connected'} · Chain:{' '}
            {chainId === baseSepolia.id ? 'Base Sepolia' : <span className="text-amber-600">Switch to Base Sepolia</span>}
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto pb-safe px-4 pt-3">
          <label className="mb-1 block text-sm font-medium">Amount (USDC)</label>
          <div className="mb-2 flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <input
                inputMode="decimal"
                pattern="[0-9]*"
                value={amount ? String(amount) : ''}
                onChange={(e) => {
                  const v = Number(e.target.value.replace(/[^\d.]/g, ''));
                  setAmount(Number.isFinite(v) ? v : 0);
                }}
                placeholder="0.00"
                className="w-full rounded-lg border border-gray-200 bg-white pl-3 pr-12 py-2 text-base outline-none ring-emerald-500 focus:ring-2 tabular-nums"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 whitespace-nowrap">USDC</span>
            </div>
            <button
              type="button"
              onClick={() => setAmount(clamp2dp(availableUSDC))}
              className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold hover:bg-gray-50 whitespace-nowrap min-w-[56px]"
            >
              MAX
            </button>
          </div>

          <div className="mb-1 text-xs text-gray-500">
            <div className="flex items-center justify-between">
              <span>Available to withdraw</span>
              <span className="font-medium text-gray-700 tabular-nums">{fmtUSD(availableUSDC)}</span>
            </div>
          </div>
          {overLimit && (
            <div className="mb-3 text-xs font-medium text-red-600">
              Insufficient balance
            </div>
          )}

          <div className="h-3" />
        </div>

        {/* Sticky footer */}
        <div className="sticky bottom-0 bg-white px-4 pt-3 pb-4 shadow-[0_-8px_24px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="h-11 flex-1 rounded-xl border border-gray-200 font-medium hover:bg-gray-50"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              onClick={handleWithdraw}
              className="h-11 flex-1 rounded-xl bg-emerald-600 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={disabled}
            >
              {submitting ? 'Processing…' : (!isConnected ? 'Connect wallet' : (!isOnBase ? 'Switch to Base' : 'Withdraw'))}
            </button>
          </div>
          <div className="pb-safe" />
        </div>
      </div>
    </div>
  );
}

