import * as React from 'react';
import { useAccount, useWriteContract, usePublicClient, useSwitchChain, useReadContract } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { useQueryClient } from '@tanstack/react-query';
import { waitForTransactionReceipt, simulateContract } from 'viem/actions';
import { getAddress } from 'viem';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { QK } from '@/lib/queryKeys';
import { invalidateAfterDeposit } from '@/utils/queryInvalidation';

// USDC Contract Address
const USDC_ADDRESS = getAddress((import.meta.env.VITE_USDC_ADDRESS_BASE_SEPOLIA || 
                                 import.meta.env.VITE_BASE_USDC_ADDRESS || 
                                 '0x036CbD53842c5426634e7929541eC2318f3dCF7e')) as `0x${string}`;

// Escrow Contract Address
const ESCROW_ADDR_ENV = getAddress((import.meta.env.VITE_BASE_ESCROW_ADDRESS ?? '')) as `0x${string}`;

// USDC ERC20 ABI (approve + allowance functions)
const ERC20_ABI = [
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    outputs: [{ type: 'uint256' }],
  },
] as const;

// Escrow ABI
const ESCROW_ABI_MIN = [
  { type: 'function', name: 'deposit', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [] },
] as const;

function usdToUsdcUnits(n: number): bigint {
  return BigInt(Math.round(n * 1_000_000));
}
function clamp2dp(v: number) { return Math.max(0, Math.floor(v * 100) / 100); }
function fmtUSD(n: number) { return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`; }

type DepositUSDCModalProps = {
  open: boolean;
  onClose: () => void;
  availableUSDC: number;
  userId: string;
  escrowAddress?: `0x${string}`;
  escrowAbi?: any;
  title?: string;
};

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
  // const { refresh: refreshWallet } = useWalletStore();

  const [amount, setAmount] = React.useState<number>(0);
  const [submitting, setSubmitting] = React.useState(false);
  const [step, setStep] = React.useState<'input' | 'approving' | 'depositing'>('input');
  const cancelledRef = React.useRef(false);
  const mountedRef = React.useRef(true);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Check current USDC allowance for escrow contract
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && escrowAddress ? [address, escrowAddress] : undefined,
    query: {
      enabled: !!address && !!escrowAddress && isConnected && chainId === baseSepolia.id,
    },
  });

  React.useEffect(() => {
    if (!open) {
      setAmount(0);
      setStep('input');
      cancelledRef.current = false;
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !submitting && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, submitting]);

  if (!open) return null;

  const cleanAmount = clamp2dp(amount || 0);
  const isOnBase = chainId === baseSepolia.id;
  const disabled =
    !isConnected ||
    !isOnBase ||
    submitting ||
    cleanAmount <= 0 ||
    cleanAmount > clamp2dp(availableUSDC);

  async function ensureBase() {
    if (chainId !== baseSepolia.id) {
      await switchChainAsync({ chainId: baseSepolia.id });
    }
  }

  function requestTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
    let to: any;
    const timeout = new Promise<never>((_, reject) => {
      to = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    });
    return Promise.race([p, timeout]).finally(() => clearTimeout(to)) as Promise<T>;
  }

  async function handleDeposit() {
    if (!address || !escrowAddress) {
      toast.error('Wallet not connected');
      return;
    }

    try {
      setSubmitting(true);
      await ensureBase();
      
      const units = usdToUsdcUnits(cleanAmount);
      const currentAllowance = allowance || BigInt(0);

      console.log('[FCZ-PAY] Deposit flow started:', {
        amount: cleanAmount,
        units: units.toString(),
        currentAllowance: currentAllowance.toString(),
        escrowAddress,
      });

      // Step 1: Check if we need approval
      if (currentAllowance < units) {
        setStep('approving');
        console.log('[FCZ-PAY] Approving USDC spend...', units.toString());
        
        toast.loading('Approving USDC...', { id: 'approve' });
        
        // Request approval for the exact amount (or unlimited: 2^256-1)
        const approveTxHash = await requestTimeout(
          writeContractAsync({
          address: USDC_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [escrowAddress, units], // Approve exact amount
        }),
          120000,
          'Approval'
        );

        console.log('[FCZ-PAY] Approval transaction sent:', approveTxHash);

        if (publicClient) {
          await requestTimeout(waitForTransactionReceipt(publicClient as any, { hash: approveTxHash }), 240000, 'Approval receipt');
        }

        toast.success('USDC approved!', { id: 'approve' });
        console.log('[FCZ-PAY] Approval confirmed');
        
        // Refetch allowance to confirm
        await refetchAllowance();
      } else {
        console.log('[FCZ-PAY] Sufficient allowance, skipping approval');
      }

      // Step 2: Deposit
      setStep('depositing');
      console.log('[FCZ-PAY] Depositing to escrow...');
      
      toast.loading('Depositing USDC...', { id: 'deposit' });

      // Preflight simulate to surface clear errors (e.g., insufficient gas, bad address)
      if (publicClient) {
        try {
          await simulateContract(publicClient as any, {
            address: escrowAddress,
            abi: escrowAbi,
            functionName: 'deposit',
            args: [units],
            account: address,
          } as any);
        } catch (simErr: any) {
          const msg = String(simErr?.shortMessage || simErr?.message || 'Simulation failed');
          if (msg.toLowerCase().includes('insufficient funds')) {
            toast.error('Not enough ETH on Base Sepolia to pay gas.', { id: 'deposit' });
          } else {
            toast.error(msg, { id: 'deposit' });
          }
          throw simErr;
        }
      }

      const depositTxHash = await requestTimeout(
        writeContractAsync({
        address: escrowAddress,
        abi: escrowAbi,
        functionName: 'deposit',
        args: [units],
      } as any),
        120000,
        'Deposit'
      );

      console.log('[FCZ-PAY] Deposit transaction sent:', depositTxHash);

      if (publicClient) {
        await requestTimeout(waitForTransactionReceipt(publicClient as any, { hash: depositTxHash }), 240000, 'Deposit receipt');
      }
      
      console.log('[FCZ-PAY] ui: deposit success', depositTxHash);
      
      // Show success toast with transaction hash
      const truncatedHash = `${depositTxHash.slice(0, 6)}...${depositTxHash.slice(-4)}`;
      toast.success(`Deposited ${fmtUSD(cleanAmount)}! Tx: ${truncatedHash}`, { 
        id: 'deposit',
        duration: 5000 
      });

      const currentUserId = useAuthStore.getState().user?.id || userId;
      if (currentUserId && address) {
        try {
          await fetch('/api/wallet/reconcile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: currentUserId,
              walletAddress: address,
              txHash: depositTxHash,
            }),
          });
        } catch (reconcileError) {
          console.warn('[FCZ-PAY] Reconcile after deposit failed:', reconcileError);
        }
      }

      // Invalidate all related queries using centralized utility
      invalidateAfterDeposit(queryClient, {
        userId: currentUserId,
        txHash: depositTxHash,
      });
      
      // Broadcast a UI refresh event for any listeners (Wallet page listens)
      window.dispatchEvent(new CustomEvent('fcz:balance:refresh'));
      
      if (mountedRef.current) onClose();
    } catch (err: any) {
      console.error('[deposit] failed:', err);
      
      if (step === 'approving') {
        toast.error(err?.shortMessage ?? err?.message ?? 'Approval failed', { id: 'approve' });
      } else {
        toast.error(err?.shortMessage ?? err?.message ?? 'Deposit failed', { id: 'deposit' });
      }
    } finally {
      cancelledRef.current = false;
      if (mountedRef.current) {
        setSubmitting(false);
        setStep('input');
      }
    }
  }

  const getButtonText = () => {
    if (!isConnected) return 'Connect wallet';
    if (!isOnBase) return 'Switch to Base';
    if (step === 'approving') return 'Approving USDC...';
    if (step === 'depositing') return 'Depositing...';
    return 'Continue';
  };

  return (
    <div className="fixed inset-0 z-modal">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
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
            >
              ✕
            </button>
          </div>
          <div className="mt-1 text-xs text-gray-500">
            Wallet: {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : 'Not connected'} · Chain:{' '}
            {chainId === baseSepolia.id ? 'Base Sepolia' : <span className="text-amber-600">Switch to Base Sepolia</span>}
          </div>
        </div>

        <div className="overflow-y-auto pb-safe px-4 pt-3">
          {step !== 'input' && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                <p className="text-sm text-blue-900 font-medium">
                  {step === 'approving' && 'Step 1/2: Approving USDC...'}
                  {step === 'depositing' && 'Step 2/2: Depositing to escrow...'}
                </p>
              </div>
              <p className="text-xs text-blue-700 mt-1">
                Please confirm in your wallet
              </p>
            </div>
          )}

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
                disabled={submitting}
                className="w-full rounded-lg border border-gray-200 bg-white pl-3 pr-12 py-2 text-base outline-none ring-emerald-500 focus:ring-2 disabled:opacity-50 tabular-nums"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 whitespace-nowrap">USDC</span>
            </div>
            <button
              type="button"
              onClick={() => setAmount(clamp2dp(availableUSDC))}
              disabled={submitting}
              className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap min-w-[56px]"
            >
              MAX
            </button>
          </div>

          <div className="mb-4 text-xs text-gray-500">
            <div className="flex items-center justify-between">
              <span>Available in wallet</span>
              <span className="font-medium text-gray-700 tabular-nums">{fmtUSD(availableUSDC)}</span>
            </div>
            <div className="mt-1">This will deposit USDC into the escrow contract on <b>Base Sepolia</b>.</div>
            {step === 'input' && (
              <div className="mt-2 text-xs text-amber-700 bg-amber-50 p-2 rounded">
                ℹ️ You'll need to approve 2 transactions: one to approve USDC, one to deposit.
              </div>
            )}
          </div>

          <div className="h-3" />
        </div>

        <div className="sticky bottom-0 bg-white px-4 pt-3 pb-4 shadow-[0_-8px_24px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="h-11 flex-1 rounded-xl border border-gray-200 font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDeposit}
              className={`h-11 flex-1 rounded-xl bg-emerald-600 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50`}
              disabled={disabled}
            >
              {getButtonText()}
            </button>
          </div>
          <div className="pb-safe" />
        </div>
      </div>
    </div>
  );
}
