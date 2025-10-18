import * as React from 'react';
import { useAccount, useWriteContract, usePublicClient, useSwitchChain } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { useQueryClient } from '@tanstack/react-query';
import { waitForTransactionReceipt } from 'viem/actions';
import toast from 'react-hot-toast';

// ---------- tiny helpers (no external deps)
const ESCROW_ADDR_ENV = (import.meta.env.VITE_BASE_ESCROW_ADDRESS ?? '') as `0x${string}`;
const ESCROW_ABI_MIN = [
  { type: 'function', name: 'deposit', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [] },
] as const;

function usdToUsdcUnits(n: number): bigint {
  return BigInt(Math.round(n * 1_000_000));
}
function clamp2dp(v: number) { return Math.max(0, Math.floor(v * 100) / 100); }
function fmtUSD(n: number) { return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`; }

// ---------- props
type DepositUSDCModalProps = {
  open: boolean;
  onClose: () => void;
  // how much ERC20 USDC the user currently has in wallet (not escrow)
  availableUSDC: number;
  // for query invalidation after success
  userId: string;
  // optional overrides if you already centralised these
  escrowAddress?: `0x${string}`;
  escrowAbi?: any;
  title?: string; // optional UI copy override
};

// ---------- component
export default function DepositUSDCModal({
  open,
  onClose,
  availableUSDC,
  userId,
  escrowAddress = ESCROW_ADDR_ENV,
  escrowAbi = ESCROW_ABI_MIN,
  title = 'Add Funds (Base USDC)',
}: DepositUSDCModalProps) {
  const queryClient = useQueryClient();
  const { address, chainId, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const [amount, setAmount] = React.useState<number>(0);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) setAmount(0);
  }, [open]);

  // close on ESC
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const cleanAmount = clamp2dp(amount || 0);
  const disabled =
    !isConnected ||
    submitting ||
    cleanAmount <= 0 ||
    cleanAmount > clamp2dp(availableUSDC);

  async function ensureBase() {
    if (chainId !== baseSepolia.id) {
      await switchChainAsync({ chainId: baseSepolia.id });
    }
  }

  async function handleDeposit() {
    try {
      setSubmitting(true);
      await ensureBase();
      const units = usdToUsdcUnits(cleanAmount);

      const txHash = await writeContractAsync({
        address: escrowAddress,
        abi: escrowAbi,
        functionName: 'deposit',
        args: [units],
      } as any);

      if (publicClient) {
        await waitForTransactionReceipt(publicClient as any, { hash: txHash });
      }
      toast.success('Deposit confirmed');

      // invalidate wallet + activity
      queryClient.invalidateQueries({ queryKey: ['wallet', 'onchain'] });
      queryClient.invalidateQueries({ queryKey: ['activity', userId] });

      onClose();
    } catch (err: any) {
      console.error('[deposit] failed:', err);
      toast.error(err?.shortMessage ?? err?.message ?? 'Deposit failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60]">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={submitting ? undefined : onClose}
      />
      {/* sheet */}
      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-md rounded-t-2xl bg-white p-4 shadow-xl">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            aria-label="Close"
            onClick={onClose}
            className="rounded p-1 hover:bg-gray-100"
            disabled={submitting}
          >
            ✕
          </button>
        </div>

        <div className="mb-3 text-xs text-gray-500">
          Wallet: {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : 'Not connected'} · Chain:{' '}
          {chainId === baseSepolia.id ? 'Base Sepolia' : <span className="text-amber-600">Switch to Base Sepolia</span>}
        </div>

        <label className="mb-1 block text-sm font-medium">Amount (USDC)</label>
        <div className="mb-2 flex items-center gap-2">
          <input
            inputMode="decimal"
            pattern="[0-9]*"
            value={amount ? String(amount) : ''}
            onChange={(e) => {
              const v = Number(e.target.value.replace(/[^\d.]/g, ''));
              setAmount(Number.isFinite(v) ? v : 0);
            }}
            placeholder="0.00"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base outline-none ring-emerald-500 focus:ring-2"
          />
          <button
            type="button"
            onClick={() => setAmount(clamp2dp(availableUSDC))}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold hover:bg-gray-50"
          >
            MAX
          </button>
        </div>

        <div className="mb-4 text-xs text-gray-500">
          Available in wallet:&nbsp;
          <span className="font-medium text-gray-700">{fmtUSD(availableUSDC)}</span>
          <div className="mt-1">
            This will deposit USDC into the escrow contract on <b>Base Sepolia</b>.
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="h-11 flex-1 rounded-xl border border-gray-200 font-medium hover:bg-gray-50"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={handleDeposit}
            className={`h-11 flex-1 rounded-xl bg-emerald-600 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50`}
            disabled={disabled}
          >
            {isConnected ? (submitting ? 'Processing…' : 'Continue') : 'Connect wallet'}
          </button>
        </div>
      </div>
    </div>
  );
}

