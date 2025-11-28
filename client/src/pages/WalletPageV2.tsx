import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, Download, DollarSign, TrendingUp, CreditCard, User, Wallet, ArrowRightLeft, Copy, ExternalLink, X, Target, Clock, Receipt, Lock, Unlock, ArrowUpRight, XCircle, Trophy, Gift, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAccount, useDisconnect, useSwitchChain } from 'wagmi';
import { useStableWalletConnection } from '@/hooks/useStableWalletConnection';
import { baseSepolia } from 'wagmi/chains';
import { useQueryClient } from '@tanstack/react-query';
import { formatTimeAgo } from '@/lib/format';
import { useAuthStore } from '../store/authStore';
import { useShallow } from 'zustand/react/shallow';
import { useAuthSession } from '../providers/AuthSessionProvider';
import { openAuthGate } from '../auth/authGateAdapter';
import AppHeader from '../components/layout/AppHeader';
import toast from 'react-hot-toast';
import { formatCurrency, formatLargeNumber, formatPercentage } from '@/lib/format';
import { useClaimableClaims, type ClaimableItem } from '@/hooks/useClaimableClaims';
import { useMerkleClaim } from '@/hooks/useMerkleClaim';
import { useNavigate, useLocation } from 'react-router-dom';
import SignedOutGateCard from '../components/auth/SignedOutGateCard';
import DepositUSDCModal from '../components/wallet/DepositUSDCModal';
import WithdrawUSDCModal from '../components/wallet/WithdrawUSDCModal';
import { useOnchainActivity, formatActivityKind } from '../hooks/useOnchainActivity';
import { useUnifiedBalance } from '../hooks/useUnifiedBalance';
import { useEscrowBalance } from '../hooks/useEscrowBalance';
import { useWalletActivity, type WalletActivityItem } from '../hooks/useWalletActivity';
import { useAutoNetworkSwitch } from '../hooks/useAutoNetworkSwitch';
import { QK } from '@/lib/queryKeys';
import { t } from '@/lib/lexicon';
import { useWeb3Recovery } from '@/providers/Web3Provider';
import { computeWalletStatus } from '@/utils/walletStatus';

interface WalletPageV2Props {
  onNavigateBack?: () => void;
}

const WalletPageV2: React.FC<WalletPageV2Props> = ({ onNavigateBack }) => {
  const { user: sessionUser } = useAuthSession();
  const { user: storeUser, isAuthenticated: storeAuth } = useAuthStore(
    useShallow((state) => ({
      user: state.user,
      isAuthenticated: state.isAuthenticated,
    })),
  );
  const [loading, setLoading] = useState(true);
  
  // Auto-switch to Base Sepolia when connected on wrong network
  useAutoNetworkSwitch();
  
  // Determine user context - prioritize session user
  const user = sessionUser || storeUser;
  const authenticated = !!sessionUser || storeAuth;
  
  // Wallet connection - use stable hook to prevent flicker during page transitions
  const queryClient = useQueryClient();
  const { address: rawAddress, isConnected: rawIsConnected, chainId: rawChainId, status: rawStatus } = useAccount();
  const { 
    isEffectivelyConnected, 
    isTransitioning, 
    address: stableAddress, 
    chainId: stableChainId,
    status: stableStatus 
  } = useStableWalletConnection();
  
  // Use stable values for UI, raw values for actions
  const address = stableAddress;
  const isConnected = isEffectivelyConnected;
  const chainId = stableChainId;
  const status = stableStatus;
  
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { sessionHealthy, triggerRecovery } = useWeb3Recovery();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = `${location.pathname}${location.search}${location.hash}`;
  
  // Debug: Track connection state changes (only in development with explicit flag)
  useEffect(() => {
    if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_WALLET === 'true') {
      console.log('[FCZ-PAY] Wallet:', { isConnected, address: address?.slice(0, 10), status });
    }
  }, [isConnected, address, status]);
  
  // Crypto wallet modal state
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showClaims, setShowClaims] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [bulkClaiming, setBulkClaiming] = useState(false);
  const [bulkTotal, setBulkTotal] = useState(0);
  const [bulkDone, setBulkDone] = useState(0);
  const { claim, isClaiming } = useMerkleClaim();
  const [txNotice, setTxNotice] = useState<{ hash: string; kind: string; predictionId?: string } | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<WalletActivityItem | null>(null);
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const effectiveSessionHealthy = sessionHealthy && !needsReconnect;
  const walletStatus = computeWalletStatus({
    isConnected,
    address,
    chainId,
    expectedChainId: baseSepolia.id,
    sessionHealthy: effectiveSessionHealthy,
    status,
    isTransitioning,
  });
  const effectiveWalletStatus = needsReconnect ? 'session_unhealthy' : walletStatus.code;
  
  // Unified balance hook - SINGLE SOURCE OF TRUTH
  const { 
    wallet: walletUSDC,
    available: escrowAvailableUSD,
    locked: escrowReservedUSD,
    total: escrowTotalUSD,
    isLoading: isLoadingBalance,
    error: balanceError,
    refetch: refetchBalances
  } = useUnifiedBalance();
  
  // On-chain escrow balance - for withdrawals (what user can actually withdraw from contract)
  const { availableUSD: onchainEscrowBalance } = useEscrowBalance();
  const [lastReadyBalances, setLastReadyBalances] = useState({
    wallet: walletUSDC ?? 0,
    available: escrowAvailableUSD ?? 0,
    reserved: escrowReservedUSD ?? 0,
    total: escrowTotalUSD ?? 0,
  });
  useEffect(() => {
    if (walletStatus.code !== 'ready') {
      return;
    }
    setLastReadyBalances(prev => {
      const next = {
        wallet: typeof walletUSDC === 'number' ? walletUSDC : prev.wallet,
        available: typeof escrowAvailableUSD === 'number' ? escrowAvailableUSD : prev.available,
        reserved: typeof escrowReservedUSD === 'number' ? escrowReservedUSD : prev.reserved,
        total: typeof escrowTotalUSD === 'number' ? escrowTotalUSD : prev.total,
      };

      if (
        next.wallet === prev.wallet &&
        next.available === prev.available &&
        next.reserved === prev.reserved &&
        next.total === prev.total
      ) {
        return prev;
      }

      return next;
    });
  }, [walletStatus.code, walletUSDC, escrowAvailableUSD, escrowReservedUSD, escrowTotalUSD]);
  
  // Wallet activity (from database - transaction history only)
  const { data: walletActivity, isLoading: isLoadingActivity } = useWalletActivity(user?.id, 20);
  const { data: claimables } = useClaimableClaims(address, 100);
  
  // Connection helpers
  const openConnectSheet = useCallback(() => {
    window.dispatchEvent(new CustomEvent('fcz:wallet:connect'));
  }, []);

  // Listen for transaction submission events to surface tx hash to the user
  useEffect(() => {
    function onTx(e: any) {
      if (!e || !e.detail) return;
      const { txHash, kind, predictionId } = e.detail || {};
      if (txHash) {
        setTxNotice({ hash: String(txHash), kind: String(kind || 'tx'), predictionId });
      }
    }
    window.addEventListener('fcz:tx', onTx as any);
    return () => window.removeEventListener('fcz:tx', onTx as any);
  }, []);

  useEffect(() => {
    const onReconnectRequired = () => {
      // Only set needsReconnect if wallet is NOT already connected
      // Stale WC errors can fire even when wallet is healthy
      if (!isConnected || !address) {
        setNeedsReconnect(true);
      }
      // Silently ignore reconnect events when wallet is already connected
    };

    window.addEventListener('fcz:wallet:reconnect-required', onReconnectRequired);
    return () => window.removeEventListener('fcz:wallet:reconnect-required', onReconnectRequired);
  }, [isConnected, address]);

  // Reset needsReconnect when wallet becomes connected and healthy
  useEffect(() => {
    if (isConnected && address && chainId === baseSepolia.id && sessionHealthy) {
      setNeedsReconnect(false);
    }
  }, [isConnected, address, chainId, sessionHealthy]);

  // Fallback: if an event was missed (e.g., user posted root on another route),
  // read the last stored tx from localStorage on mount and show the banner once.
  useEffect(() => {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i) || '';
        if (!key.startsWith('fcz:lastTx:')) continue;
        const hash = localStorage.getItem(key) || '';
        if (!hash) continue;
        if (sessionStorage.getItem(`fcz:tx:dismissed:${hash}`) === 'true') {
          continue;
        }
        const parts = key.split(':'); // fcz:lastTx:<kind>:<predictionId>[:address]
        const kind = parts[2] || 'tx';
        const predictionId = parts[3];
        setTxNotice({ hash, kind, predictionId });
        break;
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSwitchToBase = useCallback(() => {
    try {
      switchChain({ chainId: baseSepolia.id });
      toast.success('Check your wallet to confirm the network switch.');
    } catch (error) {
      console.warn('[FCZ-PAY] switchChain failed; prompting manual switch', error);
      toast.error('Please switch to Base Sepolia in your wallet.');
      openConnectSheet();
    }
  }, [openConnectSheet, switchChain]);

  const handleReconnectNow = useCallback(() => {
    triggerRecovery();
    openConnectSheet();
  }, [openConnectSheet, triggerRecovery]);

  const walletCalloutActions = useMemo(() => {
    const buttons: React.ReactNode[] = [];
    const baseBtn =
      'inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors';

    // Don't show any action buttons while reconnecting - wagmi is handling it
    if (effectiveWalletStatus === 'reconnecting') {
      return null;
    }

    if (effectiveWalletStatus === 'disconnected') {
      buttons.push(
        <button
          key="connect"
          onClick={openConnectSheet}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
        >
          <Wallet className="w-4 h-4" /> Connect wallet
        </button>,
      );
    }

    if (effectiveWalletStatus === 'wrong_network') {
      buttons.push(
        <button
          key="switch"
          onClick={handleSwitchToBase}
          className={baseBtn}
        >
          <ArrowRightLeft className="w-4 h-4" /> Switch network
        </button>,
      );
    }

    if (effectiveWalletStatus === 'session_unhealthy') {
      buttons.push(
        <button
          key="reconnect"
          onClick={handleReconnectNow}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 transition-colors"
        >
          <XCircle className="w-4 h-4" /> Reconnect wallet
        </button>,
      );
    }

    return buttons.length ? <div className="flex flex-wrap gap-2">{buttons}</div> : null;
  }, [handleReconnectNow, handleSwitchToBase, openConnectSheet, effectiveWalletStatus]);

  const ensureWalletReady = useCallback(() => {
    switch (walletStatus.code) {
      case 'ready':
        return true;
      case 'reconnecting':
        // Wallet is reconnecting - wait for it to complete
        toast('Wallet is reconnecting, please wait...');
        return false;
      case 'disconnected':
        toast.error('Connect your wallet to continue.');
        openConnectSheet();
        return false;
      case 'wrong_network':
        toast.error('Switch to Base Sepolia to continue.');
        handleSwitchToBase();
        return false;
      case 'session_unhealthy':
        toast.error('Wallet session expired. Please reconnect.');
        handleReconnectNow();
        return false;
      default:
        return false;
    }
  }, [walletStatus.code, openConnectSheet, handleReconnectNow, handleSwitchToBase]);

  const handleDeposit = useCallback(() => {
    if (!ensureWalletReady()) return;
    setShowDeposit(true);
  }, [ensureWalletReady]);

  const handleWithdraw = useCallback(() => {
    if (!ensureWalletReady()) return;
    setShowWithdraw(true);
  }, [ensureWalletReady]);

  const actionButtons = useMemo(() => {
    const disabledSecondary =
      <button
        disabled
        className="h-11 rounded-xl border-2 border-gray-300 text-gray-400 font-semibold cursor-not-allowed"
      >
        Withdraw
      </button>;

    switch (effectiveWalletStatus) {
      case 'reconnecting':
        return (
          <>
            <button
              disabled
              className="h-11 rounded-xl bg-gray-200 text-gray-500 font-semibold cursor-wait flex items-center justify-center gap-2"
            >
              <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              Reconnecting…
            </button>
            {disabledSecondary}
          </>
        );
      case 'disconnected':
        return (
          <>
            <button
              onClick={openConnectSheet}
              className="h-11 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
            >
              Connect Wallet
            </button>
            {disabledSecondary}
          </>
        );
      case 'wrong_network':
        return (
          <>
            <button
              onClick={handleSwitchToBase}
              className="h-11 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors"
            >
              Switch Network
            </button>
            <button
              disabled
              className="h-11 rounded-xl border-2 border-gray-300 text-gray-400 font-semibold cursor-not-allowed"
            >
              + Deposit
            </button>
          </>
        );
      case 'session_unhealthy':
        return (
          <>
            <button
              onClick={handleReconnectNow}
              className="h-11 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors"
            >
              Reconnect Wallet
            </button>
            {disabledSecondary}
          </>
        );
      default:
        return (
          <>
            <button
              onClick={handleDeposit}
              className="h-11 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
            >
              + Deposit
            </button>
            <button
              onClick={handleWithdraw}
              className="h-11 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold hover:border-gray-400 transition-colors disabled:opacity-50"
              disabled={!escrowAvailableUSD || escrowAvailableUSD === 0}
            >
              Withdraw
            </button>
          </>
        );
    }
  }, [effectiveWalletStatus, handleReconnectNow, handleSwitchToBase, handleDeposit, handleWithdraw, openConnectSheet, escrowAvailableUSD]);

  // Handle balance refresh after transactions
  const handleRefresh = useCallback(() => {
    // Force clear React Query cache for contract reads
    queryClient.removeQueries({ queryKey: ['readContract'] });
    
    // Wait a moment for cache clear, then refetch
    setTimeout(() => {
      refetchBalances();
    }, 500);
  }, [refetchBalances, queryClient]);

  // Listen for balance refresh events from deposit/withdraw modals
  useEffect(() => {
    window.addEventListener('fcz:balance:refresh', handleRefresh);
    return () => window.removeEventListener('fcz:balance:refresh', handleRefresh);
  }, [handleRefresh]);
  
  // Display balances using last confirmed values during reconnects to avoid UI flicker
  const resolveValue = (current: number | undefined, fallback: number) =>
    typeof current === 'number' ? current : fallback;
  const resolvedWalletUSDC =
    walletStatus.code === 'ready'
      ? resolveValue(walletUSDC, lastReadyBalances.wallet)
      : lastReadyBalances.wallet;
  const resolvedEscrowAvailable =
    walletStatus.code === 'ready'
      ? resolveValue(escrowAvailableUSD, lastReadyBalances.available)
      : lastReadyBalances.available;
  const resolvedEscrowReserved =
    walletStatus.code === 'ready'
      ? resolveValue(escrowReservedUSD, lastReadyBalances.reserved)
      : lastReadyBalances.reserved;
  const resolvedEscrowTotal =
    walletStatus.code === 'ready'
      ? resolveValue(escrowTotalUSD, lastReadyBalances.total)
      : lastReadyBalances.total;
  
  // Debug log - disabled to reduce console spam
  // Enable with VITE_DEBUG_WALLET=true in .env

  // Auto-refresh after wallet connect or chain change
  const lastConnectionRef = useRef<{ address: string | null; chainId: number | null }>({
    address: null,
    chainId: null,
  });
  useEffect(() => {
    if (!isConnected || !address || typeof chainId !== 'number') {
      return;
    }

    const prev = lastConnectionRef.current;
    if (prev.address === address && prev.chainId === chainId) {
      return;
    }

    lastConnectionRef.current = { address, chainId };

    // Ensure all wallet-related data refresh immediately after connect or chain change
    void queryClient.invalidateQueries({ queryKey: ['wallet'] });
    void queryClient.invalidateQueries({ queryKey: ['escrow-balance'] });
    void queryClient.invalidateQueries({ queryKey: ['onchain-activity'] });
    void queryClient.invalidateQueries({ queryKey: ['readContract'] });
    if (user?.id) {
      void queryClient.invalidateQueries({ queryKey: QK.walletActivity(user.id) });
    }
  }, [isConnected, address, chainId, queryClient, user?.id]);

  useEffect(() => {
    if (authenticated && user?.id) {
      setLoading(false);
    } else if (!authenticated) {
      setLoading(false);
    }
  }, [authenticated, user?.id]);

  // Helper function to format activity kind
  const prettyKind = (k: string) => {
    const normalized = (k || '').toLowerCase();
    const map: Record<string, string> = {
      deposit: 'Deposit',
      withdraw: 'Withdrawal',
      lock: 'Funds locked',
      release: 'Funds released',
      unlock: 'Funds released',
      entry: 'Stake placed',
      bet_placed: 'Stake placed',
      claim: 'Claimed',
      payout: 'Settlement payout',
      win: 'Won prediction',
      loss: 'Lost prediction',
      creator_fee: 'Creator fee',
      platform_fee: 'Platform fee',
      settlement: 'Settlement posted',
      bet_refund: 'Bet refunded',
    };
    if (map[normalized]) return map[normalized];
    return formatActivityKind(normalized);
  };

  const formatTxHash = (hash?: string | null) => {
    if (!hash) return null;
    const clean = hash.split(':')[0] ?? '';
    if (!clean.startsWith('0x')) return null;
    return `${clean.slice(0, 6)}…${clean.slice(-4)}`;
  };

  const buildExplorerTxUrl = (hash?: string | null) => {
    if (!hash) return null;
    const clean = hash.split(':')[0] ?? '';
    if (!clean.startsWith('0x')) return null;
    return `https://sepolia.basescan.org/tx/${clean}`;
  };

  const dismissTxBanner = useCallback((hash?: string) => {
    setTxNotice(null);
    if (!hash) return;
    try {
      sessionStorage.setItem(`fcz:tx:dismissed:${hash}`, 'true');
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i) || '';
        if (!key.startsWith('fcz:lastTx:')) continue;
        if (localStorage.getItem(key) === hash) {
          localStorage.removeItem(key);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Handle authentication required - NO UPSELL, clean experience
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-50 pb-[calc(5rem+env(safe-area-inset-bottom))]">
        <AppHeader title="Wallet" />
        <div className="mx-auto w-full max-w-[720px] lg:max-w-[960px] px-4 py-4">
          <div className="space-y-4">
            {/* Overview Card - Clean signed-out state */}
            <div className="bg-white rounded-2xl border border-black/[0.06] p-6">
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wallet className="w-8 h-8 text-gray-400" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Sign in to view wallet</h4>
                <p className="text-sm text-gray-600 mb-4 max-w-sm mx-auto">
                  Track your balance, deposits, and transaction history.
                </p>
                <button
                  onClick={async () => {
                    try {
                      await openAuthGate({ intent: 'view_wallet' });
                    } catch (error) {
                      console.error('Auth gate error:', error);
                    }
                  }}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
                >
                  Sign In
                </button>
              </div>
            </div>

            {/* Recent Activity Card - Empty state */}
            <div className="bg-white rounded-2xl border border-black/[0.06] p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="text-center py-6 text-gray-500">
                <p className="text-sm">Your transaction history will appear here</p>
              </div>
              {/* Funding Guide Link */}
              <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                <p className="text-sm text-gray-500 mb-2">New to crypto wallets?</p>
                <Link
                  to="/docs/funding-guide"
                  className="inline-flex items-center space-x-1 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>Learn how to fund your wallet</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Add a handler to claim a single item
  const handleClaimOne = useCallback(
    async (item: ClaimableItem) => {
      try {
        setClaimingId(item.predictionId);
        const ok = await claim({
          predictionId: item.predictionId,
          amountUnits: BigInt(item.amountUnits),
          proof: item.proof as any,
        });
        if (ok) {
          await queryClient.invalidateQueries({ queryKey: ['wallet', 'claimable'] });
          try { window.dispatchEvent(new CustomEvent('fcz:balance:refresh')); } catch {}
          return true;
        }
        return false;
      } catch (e: any) {
        // Check if already claimed or just rejected
        const msg = String(e?.message || '').toLowerCase();
        if (msg.includes('already claimed')) {
          // Mark as claimed locally even if failed
          await queryClient.invalidateQueries({ queryKey: ['wallet', 'claimable'] });
          try { window.dispatchEvent(new CustomEvent('fcz:balance:refresh')); } catch {}
          return true;
        }
        // User rejection or other error - continue with next claim
        console.warn(`Claim failed for ${item.predictionId}:`, e?.message || e);
        return false;
      } finally {
        setClaimingId(null);
      }
    },
    [claim, queryClient]
  );

  // Add a handler to claim all
  const handleClaimAll = useCallback(async () => {
    if (!claimables || claimables.length === 0) return;
    setBulkClaiming(true);
    setBulkTotal(claimables.length);
    setBulkDone(0);
    
    let successCount = 0;
    for (const item of claimables) {
      const success = await handleClaimOne(item as ClaimableItem);
      if (success) {
        successCount++;
        setBulkDone(successCount);
      }
      // Continue to next claim even if this one failed
    }
    
    setBulkClaiming(false);
    if (successCount === claimables.length) {
      toast.success(`Successfully claimed all ${successCount} ${t('winnings').toLowerCase()}!`);
    } else if (successCount > 0) {
      toast.success(`Successfully claimed ${successCount} of ${claimables.length} ${t('winnings').toLowerCase()}`);
    } else {
      toast.error(`No claims were processed`);
    }
  }, [claimables, handleClaimOne]);

  return (
    <div className="min-h-screen bg-gray-50 pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <AppHeader title="Wallet" />
      
      <div className="mx-auto w-full max-w-[720px] lg:max-w-[960px] px-4 py-4">
        <div className="space-y-4">
          {loading ? (
            <>
              {/* Professional Loading Skeleton */}
              <div className="grid grid-cols-2 gap-3">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-black/[0.06] p-4 min-h-[88px] animate-pulse">
                    <div className="h-3 bg-gray-200 rounded mb-2 w-16"></div>
                    <div className="h-6 bg-gray-200 rounded w-20"></div>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-2xl border border-black/[0.06] p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-20 mb-4"></div>
                <div className="text-center py-6">
                  <div className="h-8 bg-gray-200 rounded w-32 mx-auto mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-24 mx-auto mb-4"></div>
                  <div className="flex space-x-3">
                    <div className="flex-1 h-12 bg-gray-200 rounded-lg"></div>
                    <div className="flex-1 h-12 bg-gray-200 rounded-lg"></div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* SIMPLIFIED: Only 2 balance cards - Wallet USDC and Escrow Total */}
              <div className="grid grid-cols-2 gap-3">
                {/* 1. Wallet USDC - ERC20 balance in user's crypto wallet */}
                <div className="bg-white rounded-2xl border border-black/[0.06] p-4 min-h-[88px] flex flex-col justify-center">
                  <div className="flex items-center space-x-1 mb-2">
                    <Wallet className="w-4 h-4 text-blue-500" />
                    <div className="text-xs text-gray-600 font-medium tracking-wide">Wallet</div>
                  </div>
                  <div className="text-lg font-bold text-gray-900 font-mono truncate">
                    {isLoadingBalance
                      ? '...' 
                      : formatCurrency(resolvedWalletUSDC ?? 0, { compact: true })}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    USDC on Base
                  </div>
                </div>
                
                {/* 2. Escrow Total - Total USDC in escrow contract (available + reserved) */}
                <div className="bg-white rounded-2xl border border-black/[0.06] p-4 min-h-[88px] flex flex-col justify-center">
                  <div className="flex items-center space-x-1 mb-2">
                    <Download className="w-4 h-4 text-emerald-500" />
                    <div className="text-xs text-gray-600 font-medium tracking-wide">Escrow</div>
                  </div>
                  <div className="text-lg font-bold text-gray-900 font-mono truncate">
                    {isLoadingBalance
                      ? '...' 
                      : formatCurrency(resolvedEscrowTotal ?? 0, { compact: true })}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                    <span className="text-emerald-600 font-medium">
                      {formatCurrency(resolvedEscrowAvailable ?? 0, { compact: true })} free
                    </span>
                    {resolvedEscrowReserved > 0 && (
                      <>
                        <span className="text-gray-400">·</span>
                        <span className="text-amber-600 font-medium">
                          {formatCurrency(resolvedEscrowReserved, { compact: true })} locked
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* On-chain Balance Card - Detailed breakdown */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-4">
                <div className="flex items-center justify-between mb-4 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full whitespace-nowrap">Base Sepolia</span>
                    {isConnected && address && (
                    <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-mono text-gray-700 truncate max-w-[100px]">
                        {address.slice(0,4)}…{address.slice(-3)}
                      </span>
                    )}
                  </div>
                  {isTransitioning ? (
                    <span className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-500">
                      <span className="w-2 h-2 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                      Reconnecting...
                    </span>
                  ) : isConnected && address ? (
                    <button
                      type="button"
                      onClick={() => {
                        disconnect();
                        toast.success('Wallet disconnected');
                      }}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Disconnect
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={openConnectSheet}
                      className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Connect Wallet
                    </button>
                  )}
                </div>
                
                {/* Claimable banner */}
                {!!claimables && claimables.length > 0 && (
                  <div className="mt-3">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm text-emerald-900">
                          You have {claimables.length} claim{claimables.length > 1 ? 's' : ''} pending
                        </div>
                        <button
                          type="button"
                          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline"
                          onClick={() => setShowClaims(true)}
                        >
                          View & claim
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 whitespace-nowrap">
                      Wallet USDC <span className="ml-1 text-[10px] px-1 py-0.5 rounded bg-gray-100">ERC20</span>
                    </span>
                    <span className="font-mono font-medium tabular-nums whitespace-nowrap">
                      {resolvedWalletUSDC !== undefined 
                        ? `${resolvedWalletUSDC.toFixed(2)}`
                        : isLoadingBalance 
                          ? 'Loading...' 
                          : balanceError 
                            ? 'Error' 
                            : '$0.00'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 flex items-center gap-2 whitespace-nowrap">
                      <span className="inline-block h-1.5 w-3 rounded bg-green-500" />Available
                    </span>
                    <span className="font-mono font-semibold text-green-600 tabular-nums whitespace-nowrap">
                      {isLoadingBalance ? 'Loading...' : `${(resolvedEscrowAvailable ?? 0).toFixed(2)}`}
                    </span>
                  </div>
                  {resolvedEscrowReserved > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 flex items-center gap-2 whitespace-nowrap">
                        <span className="inline-block h-1.5 w-3 rounded bg-amber-500" />In active {t('bets')}
                      </span>
                      <span className="font-mono font-medium text-amber-600 tabular-nums whitespace-nowrap">
                        {isLoadingBalance ? 'Loading...' : `${(resolvedEscrowReserved ?? 0).toFixed(2)}`}
                      </span>
                    </div>
                  )}
                </div>
                
                {needsReconnect && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-xs p-3">
                    Wallet session expired. Please reconnect your wallet before making deposits, withdrawals, or bets.
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-3 mt-6">
                  {actionButtons}
                </div>
                
                {/* Recent Activity */}
                {walletActivity?.items && walletActivity.items.length > 0 ? (
                  <div className="mt-6 pt-4 border-t border-blue-100">
                    <h4 className="text-xs font-semibold text-gray-700 mb-3">Recent Activity</h4>
                    <div className="space-y-2">
                      {walletActivity.items.slice(0, 8).map((item) => {
                        const iconMap: Record<string, any> = {
                          deposit: Download,
                          withdraw: ArrowUpRight,
                          lock: Lock,
                          release: Unlock,
                          unlock: Unlock,
                          entry: Target,
                          bet_placed: Target,
                          claim: Receipt,
                          payout: DollarSign,
                          win: Trophy,
                          loss: XCircle,
                          creator_fee: DollarSign,
                          platform_fee: DollarSign,
                          settlement: Receipt,
                          bet_refund: Unlock,
                        };
                        const IconComponent = iconMap[item.kind] || Wallet;
                        const description = (() => {
                          if (item.kind === 'entry' && item.meta?.option_label) {
                            return `on ${item.meta.option_label}`;
                          }
                          if (item.kind === 'payout' && item.meta?.prediction_title) {
                            return `for ${item.meta.prediction_title}`;
                          }
                          if (item.kind === 'claim' && item.meta?.prediction_title) {
                            return `from ${item.meta.prediction_title}`;
                          }
                          if (item.kind === 'win' && item.meta?.prediction_title) {
                            return item.meta.prediction_title;
                          }
                          if (item.kind === 'loss' && item.meta?.prediction_title) {
                            return item.meta.prediction_title;
                          }
                          if (item.kind === 'creator_fee' && item.meta?.prediction_title) {
                            return item.meta.prediction_title;
                          }
                          if (item.kind === 'settlement' && item.meta?.prediction_title) {
                            return item.meta.prediction_title;
                          }
                          return '';
                        })();

                        return (
                          <div 
                            key={item.id} 
                            className="flex items-center justify-between text-sm gap-2 hover:bg-gray-50 rounded-lg p-2 -mx-2 cursor-pointer transition-colors"
                            onClick={() => setSelectedActivity(item)}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {IconComponent && <IconComponent className="w-4 h-4 text-gray-500 flex-shrink-0" />}
                              <div className="flex flex-col min-w-0">
                                <span className="text-gray-700 text-xs font-medium truncate">{prettyKind(item.kind)}</span>
                                {description && (
                                  <span className="text-[11px] text-gray-500 truncate">{description}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-[11px] text-gray-500 whitespace-nowrap">
                                {item.createdAt ? formatTimeAgo(item.createdAt) : ''}
                              </span>
                              <span className="font-mono text-xs font-medium whitespace-nowrap">{formatCurrency(item.amountUSD, { compact: false })}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : !isLoadingActivity ? (
                  <div className="mt-6 pt-4 border-t border-blue-100">
                    <div className="text-center py-3">
                      <p className="text-xs text-gray-500 mb-3">No transactions yet</p>
                      <Link
                        to="/docs/funding-guide"
                        className="inline-flex items-center space-x-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Learn how to fund your wallet</span>
                      </Link>
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Crypto Wallet Modals */}
      {user?.id && (
        <>
          {showDeposit && (
            <DepositUSDCModal
              open={showDeposit}
              onClose={() => setShowDeposit(false)}
              onSuccess={() => {
                setShowDeposit(false);
                handleRefresh();
              }}
              availableUSDC={walletUSDC}
              userId={user.id}
            />
          )}
          {showWithdraw && (
            <WithdrawUSDCModal
              open={showWithdraw}
              onClose={() => setShowWithdraw(false)}
              onSuccess={() => {
                setShowWithdraw(false);
                handleRefresh();
              }}
              availableUSDC={onchainEscrowBalance}
              userId={user.id}
            />
          )}
        </>
      )}

      {/* Activity detail sheet */}
      {selectedActivity && (
        <div className="fixed inset-0 z-modal flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSelectedActivity(null)} />
          <div className="relative w-full md:max-w-md bg-white rounded-t-3xl md:rounded-2xl shadow-2xl p-6 z-[1] mb-[calc(72px+env(safe-area-inset-bottom,0px))] pb-[calc(16px+env(safe-area-inset-bottom,0px))] max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Activity</p>
                <h3 className="text-lg font-semibold text-gray-900">{prettyKind(selectedActivity.kind)}</h3>
              </div>
              <button
                className="p-2 rounded-full hover:bg-gray-100"
                aria-label="Close details"
                onClick={() => setSelectedActivity(null)}
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 mb-4">
              <p className="text-xs text-gray-500 mb-1">Amount</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(selectedActivity.amountUSD, { currency: 'USD' })}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-3">
                <Clock className="w-3.5 h-3.5" />
                <span>{selectedActivity.createdAt ? formatTimeAgo(selectedActivity.createdAt) : 'Just now'}</span>
              </div>
            </div>

            {selectedActivity.meta?.prediction_title && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-1">Prediction</p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedActivity.meta.prediction_title}
                </p>
                {selectedActivity.meta.option_label && (
                  <p className="text-xs text-gray-500 mt-0.5">Position: {selectedActivity.meta.option_label}</p>
                )}
              </div>
            )}

            {selectedActivity.txHash ? (
              <div className="border border-gray-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Transaction hash</span>
                  <span className="font-mono text-xs text-gray-900 truncate max-w-[140px]">
                    {selectedActivity.txHash.slice(0, 10)}…{selectedActivity.txHash.slice(-6)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="flex-1 flex items-center justify-center gap-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl py-2 hover:bg-gray-50"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(selectedActivity.txHash || '');
                        toast.success('Copied transaction hash');
                      } catch {
                        toast.error('Unable to copy hash');
                      }
                    }}
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </button>
                  <button
                    className="flex-1 flex items-center justify-center gap-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl py-2 hover:bg-gray-50"
                    onClick={() => {
                      const url = `https://sepolia.basescan.org/tx/${selectedActivity.txHash}`;
                      window.open(url, '_blank');
                    }}
                  >
                    <ExternalLink className="w-4 h-4" />
                    View
                  </button>
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-gray-200 rounded-2xl p-4 text-sm text-gray-600 bg-gray-50">
                This entry was recorded off-chain, so a transaction hash isn’t available.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transaction details banner */}
      {txNotice && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-[calc(88px+env(safe-area-inset-bottom,0px))] z-modal">
          <div className="mx-auto flex items-center gap-3 rounded-2xl bg-white shadow-lg border border-black/[0.06] px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-600">
                {txNotice.kind === 'claim' ? 'Claim' : txNotice.kind === 'settlement' ? 'Settlement' : prettyKind(txNotice.kind)}
              </span>
              <span className="font-mono text-[11px] text-gray-500">
                {txNotice.hash.slice(0, 10)}…{txNotice.hash.slice(-6)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                className="p-1.5 rounded-lg hover:bg-gray-100"
                aria-label="View transaction"
                title="View transaction"
                onClick={() => {
                  const url = `https://sepolia.basescan.org/tx/${txNotice.hash}`;
                  window.open(url, '_blank');
                }}
              >
                <ExternalLink className="w-4 h-4 text-gray-700" />
              </button>
              <button
                className="p-1.5 rounded-lg hover:bg-gray-100"
                aria-label="Copy hash"
                title="Copy hash"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(txNotice.hash);
                    toast.success('Copied transaction hash');
                  } catch { /* ignore */ }
                }}
              >
                <Copy className="w-4 h-4 text-gray-700" />
              </button>
              <button
                className="p-1.5 rounded-lg hover:bg-gray-100"
                aria-label="Dismiss"
                title="Dismiss"
                onClick={() => dismissTxBanner(txNotice.hash)}
              >
                <X className="w-4 h-4 text-gray-700" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Claims Sheet */}
      {showClaims && (
        <div className="fixed inset-0 z-modal flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowClaims(false)} />
          {/* Push sheet above bottom nav (approx 72px) and safe-area */}
          <div className="relative w-full md:max-w-lg bg-white rounded-t-2xl md:rounded-2xl shadow-xl p-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))] mb-[calc(72px+env(safe-area-inset-bottom,0px))] max-h-[80vh] md:max-h-[75vh] overflow-y-auto">
            <div className="sticky top-0 bg-white/90 backdrop-blur px-4 pt-2 pb-3 -mx-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Your claimable {t('winnings').toLowerCase()}</h3>
              <div className="flex items-center gap-2">
                {Array.isArray(claimables) && claimables.length > 1 && (
                  <button
                    disabled={bulkClaiming || isClaiming}
                    className="h-9 px-3 rounded-lg bg-emerald-100 text-emerald-800 text-sm font-semibold hover:bg-emerald-200 disabled:opacity-50"
                    onClick={handleClaimAll}
                  >
                    {bulkClaiming ? `Claiming ${bulkDone}/${bulkTotal}…` : `Claim all (${claimables.length})`}
                  </button>
                )}
                <button
                  className="p-1.5 rounded-lg hover:bg-gray-100"
                  aria-label="Dismiss"
                  title="Dismiss"
                  onClick={() => setShowClaims(false)}
                >
                  <X className="w-4 h-4 text-gray-700" />
                </button>
              </div>
            </div>
            {!claimables || claimables.length === 0 ? (
              <div className="text-sm text-gray-600 py-6 text-center">No claimable items.</div>
            ) : (
              <div className="space-y-3">
                {claimables.map((c) => (
                  <div key={`${c.predictionId}:${c.amountUnits}`} className="flex items-center justify-between p-3 border rounded-xl">
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 truncate">{c.title || 'Settled prediction'}</div>
                      <div className="text-xs text-gray-500">Claim {formatCurrency(c.amountUSD, { compact: false })}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        className="h-9 px-3 rounded-lg border text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => navigate(`/predictions/${c.predictionId}`, {
                          state: { from: fromPath }
                        })}
                      >
                        View
                      </button>
                      <button
                        className="h-9 px-3 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
                        disabled={isClaiming && claimingId !== c.predictionId}
                        onClick={async () => {
                          try {
                            setClaimingId(c.predictionId);
                            const tx = await claim({
                              predictionId: c.predictionId,
                              amountUnits: BigInt(c.amountUnits),
                              proof: c.proof,
                            });
                            if (tx) {
                              await queryClient.invalidateQueries({ queryKey: ['wallet', 'claimable'] });
                              // trigger a balance refresh for USDC + escrow
                              window.dispatchEvent(new CustomEvent('fcz:balance:refresh'));
                            }
                          } finally {
                            setClaimingId(null);
                          }
                        }}
                      >
                        {isClaiming && claimingId === c.predictionId ? 'Claiming…' : 'Claim'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletPageV2;
