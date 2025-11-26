import * as React from 'react';
import { useAccount, useWriteContract, usePublicClient, useSwitchChain } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { useQueryClient } from '@tanstack/react-query';
import { waitForTransactionReceipt, simulateContract } from 'viem/actions';
import { getAddress, type Hash } from 'viem';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { invalidateAfterWithdraw } from '@/utils/queryInvalidation';
import { 
  parseOnchainError, 
  logTransaction, 
  broadcastBalanceRefresh,
  isSessionError,
  cleanupWalletConnectStorage,
  broadcastReconnectRequired,
  isUserRejection,
  ensureWalletReady,
  hardDelay,
} from '@/services/onchainTransactionService';
import { useWalletConnectSession } from '@/hooks/useWalletConnectSession';
import { useWeb3Recovery } from '@/providers/Web3Provider';
import { computeWalletStatus } from '@/utils/walletStatus';
import StatusCallout from '@/components/ui/StatusCallout';

const ESCROW_ADDR_ENV = (import.meta.env.VITE_BASE_ESCROW_ADDRESS 
  ? getAddress(import.meta.env.VITE_BASE_ESCROW_ADDRESS) 
  : undefined) as `0x${string}` | undefined;

const ESCROW_ABI_MIN = [
  { type: 'function', name: 'withdraw', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [] },
] as const;

function usdToUsdcUnits(n: number): bigint {
  return BigInt(Math.round(n * 1_000_000));
}
function clamp2dp(v: number) { return Math.max(0, Math.floor(v * 100) / 100); }
function fmtUSD(n: number) { return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`; }

type WithdrawStep = 'input' | 'simulating' | 'withdrawing' | 'waiting';

type WithdrawUSDCModalProps = {
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
  const { address, chainId, isConnected, connector } = useAccount();
  const publicClient = usePublicClient();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync, reset: resetWrite } = useWriteContract();
  const { sessionHealthy } = useWeb3Recovery();
  const { recoverFromError, withSessionRecovery, cleanupWalletConnectSessions, disconnectWithCleanup } = useWalletConnectSession();

  const [amount, setAmount] = React.useState<number>(0);
  const [submitting, setSubmitting] = React.useState(false);
  const [step, setStep] = React.useState<WithdrawStep>('input');
  const [error, setError] = React.useState<string | null>(null);
  const [statusMessage, setStatusMessage] = React.useState<string>('');
  const cancelledRef = React.useRef(false);
  const mountedRef = React.useRef(true);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const isModalOpen = open ?? controlledOpen ?? false;

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

  const walletStatus = computeWalletStatus({
    isConnected,
    address,
    chainId,
    expectedChainId: baseSepolia.id,
    sessionHealthy,
  });
  const walletReady = walletStatus.code === 'ready';

  const promptConnectSheet = React.useCallback(() => {
    window.dispatchEvent(new CustomEvent('fcz:wallet:connect'));
  }, []);

  const handleSwitchNetwork = React.useCallback(() => {
    switchChainAsync({ chainId: baseSepolia.id }).catch(() => {
      toast.error('Approve the network switch request in your wallet.');
    });
  }, [switchChainAsync]);

  const handleReconnectClick = React.useCallback(async () => {
    try {
      await disconnectWithCleanup();
    } catch (err) {
      console.warn('[FCZ-WALLET] Manual reconnect cleanup failed:', err);
    } finally {
      promptConnectSheet();
    }
  }, [disconnectWithCleanup, promptConnectSheet]);

  const walletCalloutActions = React.useMemo(() => {
    const buttons: React.ReactNode[] = [];
    const baseBtn =
      'inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors';

    if (walletStatus.code === 'disconnected') {
      buttons.push(
        <button
          key="connect"
          type="button"
          className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
          onClick={promptConnectSheet}
        >
          Connect wallet
        </button>,
      );
    }

    if (walletStatus.code === 'wrong_network') {
      buttons.push(
        <button
          key="switch"
          type="button"
          className={baseBtn}
          onClick={handleSwitchNetwork}
        >
          Switch network
        </button>,
      );
    }

    if (walletStatus.code === 'session_unhealthy') {
      buttons.push(
        <button
          key="reconnect"
          type="button"
          className="inline-flex items-center rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 transition-colors"
          onClick={handleReconnectClick}
        >
          Reconnect wallet
        </button>,
      );
    }

    return buttons.length ? <div className="flex flex-wrap gap-2">{buttons}</div> : null;
  }, [handleReconnectClick, handleSwitchNetwork, promptConnectSheet, walletStatus.code]);

  // Guard: Missing escrow address
  if (!escrowAddress) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleClose}>
        <div className="bg-white rounded-lg p-6 max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-lg font-semibold mb-2 text-red-600">Configuration Error</h2>
          <p className="text-gray-600 mb-4">
            Escrow contract address is not configured. Please contact support.
          </p>
          <button
            onClick={handleClose}
            className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const cleanAmount = clamp2dp(amount || 0);
  const overLimit = cleanAmount > clamp2dp(availableUSDC);
  const isOnBase = chainId === baseSepolia.id;
  const disabled =
    !walletReady || !isConnected || !isOnBase || submitting || cleanAmount <= 0 || overLimit;

  async function ensureBase() {
    if (chainId !== baseSepolia.id) {
      try {
        await switchChainAsync({ chainId: baseSepolia.id });
      } catch (err) {
        const wasSessionError = await handleSessionErrorRecovery(err);
        if (!wasSessionError) {
          const parsed = parseOnchainError(err);
          toast.error(parsed.message);
          setError(parsed.message);
        }
        throw err;
      }
    }
  }

  /**
   * Handle session errors with recovery
   * Returns true if error was handled (session error)
   */
  async function handleSessionErrorRecovery(err: unknown): Promise<boolean> {
    if (!isSessionError(err)) {
      return false;
    }
    
    console.log('[FCZ-PAY] Detected stale WalletConnect session, attempting recovery...');
    
    try {
      // Clean up storage first
      cleanupWalletConnectStorage();
      
      // Try to recover
      await recoverFromError({ attemptReconnect: true });
      
      // Notify user
      toast.error('Wallet session expired. Please reconnect and try again.', { id: 'session-error' });
      broadcastReconnectRequired('Wallet session expired');
      
      return true;
    } catch (recoveryErr) {
      console.error('[FCZ-PAY] Session recovery failed:', recoveryErr);
      // Force cleanup even if recovery fails
      cleanupWalletConnectStorage();
      await cleanupWalletConnectSessions();
      toast.error('Wallet connection lost. Please reconnect.', { id: 'session-error' });
      return true;
    }
  }

  const validateWalletReady = React.useCallback(() => {
    try {
      ensureWalletReady({
        address,
        chainId,
        expectedChainId: baseSepolia.id,
        isConnected,
        sessionHealthy,
      });
      return true;
    } catch (err) {
      const parsed = parseOnchainError(err);
      setError(parsed.message);
      toast.error(parsed.message);
      return false;
    }
  }, [address, chainId, isConnected, sessionHealthy]);

  async function handleWithdraw() {
    if (!address || !escrowAddress) {
      toast.error('Wallet not connected');
      return;
    }

    if (!validateWalletReady()) {
      return;
    }

    const currentUserId = useAuthStore.getState().user?.id || userId;
    let txHash: Hash | null = null;

    try {
      setSubmitting(true);
      setError(null);
      setStatusMessage('');
      resetWrite();
      
      await ensureBase();
      const units = usdToUsdcUnits(cleanAmount);

      console.log('[FCZ-PAY] Withdraw flow started:', {
        amount: cleanAmount,
        units: units.toString(),
        escrowAddress,
        connector: connector?.id,
      });

      // Preflight simulate to surface clear errors
      setStep('simulating');
      setStatusMessage('Validating withdrawal...');
      if (publicClient) {
        try {
          await simulateContract(publicClient as any, {
            address: escrowAddress,
            abi: escrowAbi,
            functionName: 'withdraw',
            args: [units],
            account: address,
          } as any);
          console.log('[FCZ-PAY] Withdraw simulation passed');
        } catch (simErr: unknown) {
          const parsed = parseOnchainError(simErr);
          console.error('[FCZ-PAY] Withdraw simulation failed:', parsed);
          
          if (parsed.code === 'INSUFFICIENT_GAS') {
            toast.error('Not enough ETH on Base Sepolia to pay gas. Add ETH and try again.', { id: 'withdraw' });
          } else if (parsed.code === 'INSUFFICIENT_BALANCE' || parsed.code === 'INSUFFICIENT_ESCROW') {
            toast.error('Insufficient escrow balance to withdraw.', { id: 'withdraw' });
          } else {
            toast.error(parsed.message, { id: 'withdraw' });
          }
          throw simErr;
        }
      }

      setStep('withdrawing');
      setStatusMessage('Confirm withdrawal in your wallet...');
      toast.loading('Confirm withdrawal in your wallet...', { id: 'withdraw' });

      // Execute with session recovery and HARD timeout
      try {
        txHash = await withSessionRecovery(async () => {
          return await writeContractAsync({
            address: escrowAddress,
            abi: escrowAbi,
            functionName: 'withdraw',
            args: [units],
          } as any);
        }, { maxRetries: 1, showToast: false, operationTimeoutMs: 60000 }) as Hash;
      } catch (writeErr) {
        // Check for user rejection first
        if (isUserRejection(writeErr)) {
          toast.dismiss('withdraw');
          throw new Error('Transaction cancelled');
        }
        
        // Check for session errors
        const wasSessionError = await handleSessionErrorRecovery(writeErr);
        if (wasSessionError) {
          throw new Error('Wallet session expired. Please reconnect and try again.');
        }
        
        throw writeErr;
      }

      if (!txHash) {
        throw new Error('Missing transaction hash after wallet confirmation');
      }

      console.log('[FCZ-PAY] Withdraw transaction sent:', txHash);
      
      // Log withdrawal as pending
      if (currentUserId) {
        await logTransaction({
          userId: currentUserId,
          walletAddress: address,
          txHash,
          type: 'withdraw',
          status: 'pending',
          amount: cleanAmount,
        }).catch(e => console.warn('[FCZ-PAY] Log failed:', e));
      }

      setStep('waiting');
      setStatusMessage('Waiting for blockchain confirmation...');
      toast.loading('Waiting for confirmation...', { id: 'withdraw' });

      if (publicClient) {
        const receipt = await waitForTransactionReceipt(publicClient as any, { 
          hash: txHash,
          confirmations: 1,
          timeout: 180_000,
        });
        
        if (receipt.status === 'reverted') {
          throw new Error('Withdrawal transaction reverted on-chain');
        }
      }
      
      console.log('[FCZ-PAY] ✓ Withdraw success:', txHash);
      
      // Log withdrawal as completed
      if (currentUserId) {
        await logTransaction({
          userId: currentUserId,
          walletAddress: address,
          txHash,
          type: 'withdraw',
          status: 'completed',
          amount: cleanAmount,
        }).catch(e => console.warn('[FCZ-PAY] Log failed:', e));
      }
      
      // Show success toast with link
      const truncatedHash = `${txHash.slice(0, 6)}...${txHash.slice(-4)}`;
      toast.success(
        <div className="flex flex-col">
          <span>Withdrew {fmtUSD(cleanAmount)}!</span>
          <a 
            href={`https://sepolia.basescan.org/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 underline"
          >
            View tx: {truncatedHash}
          </a>
        </div>,
        { id: 'withdraw', duration: 6000 }
      );

      // Reconcile wallet balance with backend
      if (currentUserId && address) {
        try {
          await fetch('/api/wallet/reconcile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: currentUserId,
              walletAddress: address,
              txHash: txHash,
            }),
          });
          console.log('[FCZ-PAY] Wallet reconciled with backend');
        } catch (reconcileError) {
          console.warn('[FCZ-PAY] Reconcile after withdraw failed:', reconcileError);
        }
      }

      // Give the chain some time to settle before invalidating queries
      await hardDelay(1000, 'Post-withdraw settle');

      // Invalidate queries
      invalidateAfterWithdraw(queryClient, {
        userId: currentUserId,
        txHash: txHash,
      });

      // Broadcast refresh event
      broadcastBalanceRefresh();

      if (mountedRef.current) {
        handleClose();
        onSuccess?.();
      }
    } catch (err: unknown) {
      console.error('[FCZ-PAY] Withdraw failed:', err);
      
      // Check for session errors (if not already handled)
      const wasSessionError = await handleSessionErrorRecovery(err);
      
      if (txHash && currentUserId && !wasSessionError) {
        const parsed = parseOnchainError(err);
        await logTransaction({
          userId: currentUserId,
          walletAddress: address!,
          txHash,
          type: 'withdraw',
          status: 'failed',
          amount: cleanAmount,
          error: parsed.message,
        }).catch(e => console.warn('[FCZ-PAY] Log failed:', e));
      }

      const parsed = parseOnchainError(err);
      setError(parsed.message);
      
      if (!wasSessionError) {
        toast.error(`Withdrawal failed: ${parsed.message}`, { id: 'withdraw' });
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
    if (step === 'simulating') return 'Validating...';
    if (step === 'withdrawing') return 'Confirm in wallet...';
    if (step === 'waiting') return 'Waiting for confirmation...';
    return 'Withdraw';
  };

  const getStepInfo = () => {
    switch (step) {
      case 'simulating':
        return { step: 1, total: 2, message: statusMessage || 'Validating withdrawal...' };
      case 'withdrawing':
        return { step: 2, total: 2, message: statusMessage || 'Withdrawing USDC - confirm in wallet' };
      case 'waiting':
        return { step: 2, total: 2, message: statusMessage || 'Waiting for confirmation...' };
      default:
        return null;
    }
  };

  const stepInfo = getStepInfo();

  return (
    <div className="fixed inset-0 z-modal">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={submitting ? undefined : handleClose}
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
              onClick={handleClose}
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

        <div className="overflow-y-auto pb-safe px-4 pt-3">
          {walletStatus.code !== 'ready' && (
            <StatusCallout
              className="mb-4"
              tone={walletStatus.code === 'session_unhealthy' ? 'error' : 'warning'}
              title="Wallet action required"
              message={walletStatus.message ?? 'Update your wallet connection to continue.'}
              actions={walletCalloutActions}
            />
          )}

          {/* Error display */}
          {error && step === 'input' && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
              <button 
                onClick={() => setError(null)}
                className="text-xs text-red-600 underline mt-1"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Progress indicator */}
          {stepInfo && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                <p className="text-sm text-blue-900 font-medium">
                  Step {stepInfo.step}/{stepInfo.total}: {stepInfo.message}
                </p>
              </div>
              {step === 'withdrawing' && (
                <p className="text-xs text-blue-700 mt-1">
                  Please check your wallet for the confirmation request
                </p>
              )}
              {step === 'waiting' && (
                <p className="text-xs text-blue-700 mt-1">
                  Transaction submitted, waiting for block confirmation...
                </p>
              )}
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
              onClick={handleWithdraw}
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
