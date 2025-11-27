import * as React from 'react';
import { useAccount, useWriteContract, usePublicClient, useSwitchChain } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { useQueryClient } from '@tanstack/react-query';
import { waitForTransactionReceipt, simulateContract } from 'viem/actions';
import { getAddress, type Hash, formatUnits } from 'viem';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { invalidateAfterDeposit } from '@/utils/queryInvalidation';
import { 
  parseOnchainError, 
  logTransaction, 
  broadcastBalanceRefresh,
  isUserRejection,
  cleanupWalletConnectStorage,
  isSessionError,
} from '@/services/onchainTransactionService';
import { getApiUrl } from '@/utils/environment';
import { useWeb3Recovery } from '@/providers/Web3Provider';

// USDC Contract Address - ensure proper checksumming
function getChecksummedAddress(address: string | undefined): `0x${string}` {
  if (!address) {
    throw new Error('USDC address not configured');
  }
  // Trim whitespace and ensure it's a valid hex string
  const trimmed = address.trim();
  if (!trimmed.startsWith('0x') || trimmed.length !== 42) {
    throw new Error(`Invalid address format: ${trimmed}`);
  }
  // getAddress() will validate checksum and return properly checksummed address
  return getAddress(trimmed as `0x${string}`);
}

const USDC_ADDRESS_RAW = import.meta.env.VITE_USDC_ADDRESS_BASE_SEPOLIA || 
                          import.meta.env.VITE_BASE_USDC_ADDRESS || 
                          '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const USDC_ADDRESS = getChecksummedAddress(USDC_ADDRESS_RAW);

const ESCROW_ADDR_ENV: `0x${string}` | undefined = import.meta.env.VITE_BASE_ESCROW_ADDRESS 
  ? getChecksummedAddress(import.meta.env.VITE_BASE_ESCROW_ADDRESS)
  : undefined;

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
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

const ESCROW_ABI_MIN = [
  { type: 'function', name: 'deposit', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [] },
] as const;

function usdToUsdcUnits(n: number): bigint {
  return BigInt(Math.round(n * 1_000_000));
}
function clamp2dp(v: number) { return Math.max(0, Math.floor(v * 100) / 100); }
function fmtUSD(n: number) { return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`; }

type DepositStep = 'input' | 'approving' | 'depositing';

type DepositUSDCModalProps = {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  availableUSDC?: number;
  userId?: string;
  escrowAddress?: `0x${string}`;
  escrowAbi?: any;
  title?: string;
  onSuccess?: () => void;
};

export default function DepositUSDCModal({
  open,
  isOpen: controlledOpen,
  onClose,
  availableUSDC = 0,
  userId = '',
  escrowAddress = ESCROW_ADDR_ENV,
  escrowAbi = ESCROW_ABI_MIN,
  title = 'Add Funds',
  onSuccess,
}: DepositUSDCModalProps) {
  const queryClient = useQueryClient();
  const { address, chainId, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync, reset: resetWrite } = useWriteContract();
  const { sessionHealthy } = useWeb3Recovery();

  const [amount, setAmount] = React.useState<number>(0);
  const [submitting, setSubmitting] = React.useState(false);
  const [step, setStep] = React.useState<DepositStep>('input');
  const [error, setError] = React.useState<string | null>(null);
  const [statusMessage, setStatusMessage] = React.useState<string>('');
  const cancelledRef = React.useRef(false);
  const mountedRef = React.useRef(true);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const isModalOpen = open ?? controlledOpen ?? false;
  const isOnBase = chainId === baseSepolia.id;
  const walletReady = isConnected && address && isOnBase && sessionHealthy !== false;

  // Reset state when modal closes
  React.useEffect(() => {
    if (!isModalOpen) {
      setAmount(0);
      setStep('input');
      setError(null);
      setStatusMessage('');
      cancelledRef.current = false;
      resetWrite();
    }
  }, [isModalOpen, resetWrite]);

  // Handle escape key
  React.useEffect(() => {
    if (!isModalOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !submitting && handleClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isModalOpen, submitting]);

  const handleClose = React.useCallback(() => {
    if (submitting) {
      cancelledRef.current = true;
    }
    onClose();
  }, [submitting, onClose]);

  if (!isModalOpen) return null;

  if (!escrowAddress) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleClose}>
        <div className="bg-white rounded-lg p-6 max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-lg font-semibold mb-2 text-red-600">Configuration Error</h2>
          <p className="text-gray-600 mb-4">Escrow contract not configured.</p>
          <button onClick={handleClose} className="w-full px-4 py-2 bg-gray-200 rounded-lg">Close</button>
        </div>
      </div>
    );
  }

  const cleanAmount = clamp2dp(amount || 0);
  const disabled = !walletReady || submitting || cleanAmount <= 0 || cleanAmount > clamp2dp(availableUSDC);

  async function readAllowance(): Promise<bigint> {
    if (!publicClient || !address || !escrowAddress) return BigInt(0);
    try {
      const result = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address, escrowAddress],
      });
      return result as bigint;
    } catch {
      return BigInt(0);
    }
  }

  async function handleDeposit() {
    if (!address || !escrowAddress || !publicClient) {
      toast.error('Wallet not connected');
      return;
    }

    const currentUserId = useAuthStore.getState().user?.id || userId;
    const units = usdToUsdcUnits(cleanAmount);

    try {
      setSubmitting(true);
      setError(null);
      setStatusMessage('');
      resetWrite();

      // Ensure correct network
      if (chainId !== baseSepolia.id) {
        await switchChainAsync({ chainId: baseSepolia.id });
      }

      // Check current allowance
      const currentAllowance = await readAllowance();
      console.log('[Deposit] Current allowance:', formatUnits(currentAllowance, 6));

      // Step 1: Approve if needed
      if (currentAllowance < units) {
        setStep('approving');
        setStatusMessage('Approve USDC in your wallet...');
        
        const approveTxHash = await writeContractAsync({
          address: USDC_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [escrowAddress, units],
        });

        console.log('[Deposit] Approval tx:', approveTxHash);
        setStatusMessage('Waiting for approval confirmation...');

        // Wait for receipt
        const receipt = await waitForTransactionReceipt(publicClient as any, { 
          hash: approveTxHash as Hash,
          confirmations: 1,
          timeout: 120_000,
        });

        if (receipt.status === 'reverted') {
          throw new Error('Approval transaction failed');
        }

        // Log approval (async, non-blocking)
        logTransaction({
          userId: currentUserId,
          walletAddress: address,
          txHash: approveTxHash,
          type: 'approval',
          status: 'completed',
          amount: cleanAmount,
        }).catch(() => {});

        // Wait for propagation - simple 4 second wait
        setStatusMessage('Confirming approval...');
        await new Promise(r => setTimeout(r, 4000));

        toast.success('USDC approved!', { id: 'approve' });
      }

      if (cancelledRef.current) return;

      // Step 2: Deposit
      setStep('depositing');
      setStatusMessage('Confirm deposit in your wallet...');

      // Simulate first
      try {
        await simulateContract(publicClient as any, {
          address: escrowAddress,
          abi: escrowAbi,
          functionName: 'deposit',
          args: [units],
          account: address,
        } as any);
      } catch (simErr) {
        const parsed = parseOnchainError(simErr);
        if (parsed.code === 'INSUFFICIENT_ALLOWANCE') {
          // Allowance not propagated yet, wait and retry
          setStatusMessage('Waiting for approval to propagate...');
          await new Promise(r => setTimeout(r, 3000));
          // Try simulation again
          await simulateContract(publicClient as any, {
            address: escrowAddress,
            abi: escrowAbi,
            functionName: 'deposit',
            args: [units],
            account: address,
          } as any);
        } else {
          throw simErr;
        }
      }

      const depositTxHash = await writeContractAsync({
        address: escrowAddress,
        abi: escrowAbi,
        functionName: 'deposit',
        args: [units],
      } as any);

      console.log('[Deposit] Deposit tx:', depositTxHash);
      setStatusMessage('Waiting for deposit confirmation...');

      // Log deposit pending (async)
      logTransaction({
        userId: currentUserId,
        walletAddress: address,
        txHash: depositTxHash,
        type: 'deposit',
        status: 'pending',
        amount: cleanAmount,
      }).catch(() => {});

      const depositReceipt = await waitForTransactionReceipt(publicClient as any, { 
        hash: depositTxHash as Hash,
        confirmations: 1,
        timeout: 120_000,
      });

      if (depositReceipt.status === 'reverted') {
        throw new Error('Deposit transaction failed');
      }

      // Log deposit completed (async)
      logTransaction({
        userId: currentUserId,
        walletAddress: address,
        txHash: depositTxHash,
        type: 'deposit',
        status: 'completed',
        amount: cleanAmount,
      }).catch(() => {});

      // Reconcile with backend (async)
      const apiBase = getApiUrl();
      fetch(`${apiBase}/api/wallet/reconcile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId, walletAddress: address, txHash: depositTxHash }),
      }).catch(() => {});

      toast.success(
        <div className="flex flex-col">
          <span>Deposited {fmtUSD(cleanAmount)}!</span>
          <a 
            href={`https://sepolia.basescan.org/tx/${depositTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 underline"
          >
            View on BaseScan
          </a>
        </div>,
        { duration: 5000 }
      );

      invalidateAfterDeposit(queryClient, { userId: currentUserId, txHash: depositTxHash });
      broadcastBalanceRefresh();

      if (mountedRef.current) {
        handleClose();
        onSuccess?.();
      }
    } catch (err: unknown) {
      console.error('[Deposit] Error:', err);

      if (isUserRejection(err)) {
        toast.dismiss();
        setError('Transaction cancelled');
      } else if (isSessionError(err)) {
        cleanupWalletConnectStorage();
        setError('Wallet session expired. Please reconnect.');
      } else {
        const parsed = parseOnchainError(err);
        setError(parsed.message);
        toast.error(parsed.message);
      }
    } finally {
      cancelledRef.current = false;
      if (mountedRef.current) {
        setSubmitting(false);
        setStep('input');
        setStatusMessage('');
      }
    }
  }

  const getButtonText = () => {
    if (!isConnected) return 'Connect wallet';
    if (!isOnBase) return 'Switch to Base';
    if (step === 'approving') return 'Approving...';
    if (step === 'depositing') return 'Depositing...';
    return 'Deposit';
  };

  return (
    <div className="fixed inset-0 z-modal">
      <div className="absolute inset-0 bg-black/40" onClick={submitting ? undefined : handleClose} />
      <div className="z-modal fixed inset-x-0 mx-auto w-full max-w-md rounded-t-2xl bg-white shadow-xl bottom-[calc(64px+env(safe-area-inset-bottom,0px))] max-h-[calc(100vh-env(safe-area-inset-top,0px)-64px-env(safe-area-inset-bottom,0px))] focus:outline-none">
        <div className="mx-auto mt-2 mb-3 h-1.5 w-16 rounded-full bg-gray-200" />
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button aria-label="Close" onClick={handleClose} className="rounded-full p-2 hover:bg-gray-100" disabled={submitting}>✕</button>
          </div>
          <div className="mt-1 text-xs text-gray-500">
            Wallet: {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : 'Not connected'}
          </div>
        </div>

        <div className="overflow-y-auto pb-safe px-4 pt-3">
          {error && step === 'input' && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
              <button onClick={() => setError(null)} className="text-xs text-red-600 underline mt-1">Dismiss</button>
            </div>
          )}

          {submitting && statusMessage && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                <p className="text-sm text-blue-900 font-medium">{statusMessage}</p>
              </div>
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
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">USDC</span>
            </div>
            <button
              type="button"
              onClick={() => setAmount(clamp2dp(availableUSDC))}
              disabled={submitting}
              className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50"
            >
              MAX
            </button>
          </div>

          <div className="mb-4 text-xs text-gray-500">
            <div className="flex items-center justify-between">
              <span>Available in wallet</span>
              <span className="font-medium text-gray-700">{fmtUSD(availableUSDC)}</span>
            </div>
            <div className="mt-2 text-slate-600 bg-slate-50 border border-slate-100 p-2 rounded-lg">
              Deposits USDC into escrow on Base Sepolia. May require 2 transactions.
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white px-4 pt-3 pb-4 shadow-[0_-8px_24px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="h-11 flex-1 rounded-xl border border-gray-200 font-medium hover:bg-gray-50 disabled:opacity-50"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              onClick={handleDeposit}
              className="h-11 flex-1 rounded-xl bg-emerald-600 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
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
