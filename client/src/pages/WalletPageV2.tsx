import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Download, DollarSign, TrendingUp, CreditCard, User, Wallet, ArrowRightLeft, Copy, ExternalLink, X, Target, Clock, Receipt, Lock, Unlock, ArrowUpRight, XCircle } from 'lucide-react';
import { useAccount, useDisconnect, useSwitchChain } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { useQueryClient } from '@tanstack/react-query';
import { formatTimeAgo } from '@/lib/format';
import { useAuthStore } from '../store/authStore';
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
import { useWalletActivity, type WalletActivityItem } from '../hooks/useWalletActivity';
import { useAutoNetworkSwitch } from '../hooks/useAutoNetworkSwitch';
import { QK } from '@/lib/queryKeys';
import { L } from '@/lib/lexicon';

interface WalletPageV2Props {
  onNavigateBack?: () => void;
}

const WalletPageV2: React.FC<WalletPageV2Props> = ({ onNavigateBack }) => {
  const { user: sessionUser } = useAuthSession();
  const { user: storeUser, isAuthenticated: storeAuth } = useAuthStore();
  const [loading, setLoading] = useState(true);
  
  // Auto-switch to Base Sepolia when connected on wrong network
  useAutoNetworkSwitch();
  
  // Determine user context - prioritize session user
  const user = sessionUser || storeUser;
  const authenticated = !!sessionUser || storeAuth;
  
  // Wallet connection
  const queryClient = useQueryClient();
  const { address, isConnected, chainId, status } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = `${location.pathname}${location.search}${location.hash}`;
  
  // Crypto wallet modal state
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showClaims, setShowClaims] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [bulkClaiming, setBulkClaiming] = useState(false);
  const [bulkTotal, setBulkTotal] = useState(0);
  const [bulkDone, setBulkDone] = useState(0);
  const { claim, isClaiming } = useMerkleClaim();
  const [selectedActivity, setSelectedActivity] = useState<WalletActivityItem | null>(null);
  
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
  
  // Wallet activity (from database - transaction history only)
  const { data: walletActivity, isLoading: isLoadingActivity } = useWalletActivity(user?.id, 20);
  const { data: claimables } = useClaimableClaims(address, 100);
  
  // Connection helpers
  const openConnectSheet = useCallback(() => {
    window.dispatchEvent(new CustomEvent('fcz:wallet:connect'));
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

  const ensureWalletReady = useCallback(() => {
    if (!isConnected) {
      openConnectSheet();
      return false;
    }
    if (chainId !== baseSepolia.id) {
      handleSwitchToBase();
      return false;
    }
    return true;
  }, [chainId, handleSwitchToBase, isConnected, openConnectSheet]);

  const handleDeposit = useCallback(() => {
    if (!ensureWalletReady()) return;
    setShowDeposit(true);
  }, [ensureWalletReady]);

  const handleWithdraw = useCallback(() => {
    if (!ensureWalletReady()) return;
    setShowWithdraw(true);
  }, [ensureWalletReady]);

  // Handle balance refresh after transactions
  const handleRefresh = useCallback(() => {
    console.log('[FCZ-PAY] Refreshing balances after transaction');
    
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
  
  // Display wallet balance (0 when no access)
  const displayWalletUSDC = (isConnected && chainId === baseSepolia.id) ? walletUSDC : 0;
  
  // Debug log
  useEffect(() => {
    if (isConnected && chainId === baseSepolia.id) {
      console.log('[FCZ-PAY] WalletPage balance state:', {
        walletUSDC,
        escrowAvailableUSD,
        escrowReservedUSD,
        escrowTotalUSD,
        isLoadingBalance,
      });
    }
  }, [walletUSDC, escrowAvailableUSD, escrowReservedUSD, escrowTotalUSD, isLoadingBalance, isConnected, chainId]);

  // Auto-refresh after wallet connect or chain change
  useEffect(() => {
    if (!isConnected || !address) return;

    // Ensure all wallet-related data refresh immediately after connect or chain change
    void queryClient.invalidateQueries({ queryKey: ['wallet'] });
    void queryClient.invalidateQueries({ queryKey: ['escrow-balance'] });
    void queryClient.invalidateQueries({ queryKey: ['onchain-activity'] });
    void queryClient.invalidateQueries({ queryKey: ['readContract'] });
    if (user?.id) {
      void queryClient.invalidateQueries({ queryKey: QK.walletActivity(user.id) });
    }
  }, [isConnected, address, chainId, status, queryClient, user?.id]);

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
      entry: `${L("betPlaced")}`,
      claim: 'Claimed',
      payout: 'Settlement payout',
    };
    if (map[normalized]) return map[normalized];
    return normalized.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };


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
      toast.success(`Successfully claimed all ${successCount} ${L("winnings")}!`);
    } else if (successCount > 0) {
      toast.success(`Successfully claimed ${successCount} of ${claimables.length} ${L("winnings")}`);
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
                      : formatCurrency(displayWalletUSDC ?? 0, { compact: true })}
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
                      : formatCurrency(escrowTotalUSD ?? 0, { compact: true })}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                    <span className="text-emerald-600 font-medium">
                      {formatCurrency(escrowAvailableUSD ?? 0, { compact: true })} free
                    </span>
                    {escrowReservedUSD > 0 && (
                      <>
                        <span className="text-gray-400">·</span>
                        <span className="text-amber-600 font-medium">
                          {formatCurrency(escrowReservedUSD, { compact: true })} locked
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Network Warning - Inline */}
              {isConnected && chainId !== baseSepolia.id && (
                <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl flex items-start gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-amber-900 mb-1">Switch to Base Sepolia</h4>
                    <p className="text-xs text-amber-800 mb-3">
                      You are connected to <strong>{chainId ?? 'Unknown network'}</strong>. Switch to <strong>Base Sepolia</strong> to continue.
                    </p>
                    <button
                      onClick={handleSwitchToBase}
                      className="inline-flex items-center gap-2 rounded-lg bg-amber-500 text-white text-xs font-semibold px-3 py-2 hover:bg-amber-600 transition-colors"
                    >
                      <ArrowRightLeft className="w-4 h-4" /> Switch Network
                    </button>
                  </div>
                </div>
              )}
              
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
                  {isConnected && address ? (
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
                      {displayWalletUSDC !== undefined 
                        ? `${displayWalletUSDC.toFixed(2)}` 
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
                      {isLoadingBalance ? 'Loading...' : `${(escrowAvailableUSD ?? 0).toFixed(2)}`}
                    </span>
                  </div>
                  {escrowReservedUSD > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 flex items-center gap-2 whitespace-nowrap">
                        <span className="inline-block h-1.5 w-3 rounded bg-amber-500" />In active {L("bets")}
                      </span>
                      <span className="font-mono font-medium text-amber-600 tabular-nums whitespace-nowrap">
                        {isLoadingBalance ? 'Loading...' : `${(escrowReservedUSD ?? 0).toFixed(2)}`}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-3 mt-6">
                  {!isConnected ? (
                    <>
                      <button
                        onClick={openConnectSheet}
                        className="h-11 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
                      >
                        Connect Wallet
                      </button>
                      <button
                        disabled
                        className="h-11 rounded-xl border-2 border-gray-300 text-gray-400 font-semibold cursor-not-allowed"
                      >
                        Withdraw
                      </button>
                    </>
                  ) : chainId !== baseSepolia.id ? (
                    <>
                      <button
                        onClick={handleSwitchToBase}
                        className="h-11 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors"
                      >
                        Switch Network
                      </button>
                      <button
                        onClick={handleDeposit}
                        className="h-11 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
                      >
                        + Deposit
                      </button>
                    </>
                  ) : (
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
                  )}
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
                          entry: Target,
                          claim: Receipt,
                          payout: DollarSign
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
                    <div className="text-center py-3 text-xs text-gray-500">No transactions yet</div>
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
              availableUSDC={escrowAvailableUSD}
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


      {/* Claims Sheet */}
      {showClaims && (
        <div className="fixed inset-0 z-modal flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowClaims(false)} />
          {/* Push sheet above bottom nav (approx 72px) and safe-area */}
          <div className="relative w-full md:max-w-lg bg-white rounded-t-2xl md:rounded-2xl shadow-xl p-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))] mb-[calc(72px+env(safe-area-inset-bottom,0px))] max-h-[80vh] md:max-h-[75vh] overflow-y-auto">
            <div className="sticky top-0 bg-white/90 backdrop-blur px-4 pt-2 pb-3 -mx-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Your claimable {L("winnings")}</h3>
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

      {/* Compliance Disclaimer - Store-safe text only */}
      <div className="px-4 pb-6 pt-4">
        <p className="text-xs text-gray-500 text-center leading-relaxed">
          Crypto features may be unavailable in your region. Not investment advice. Must be 18+ to use.
        </p>
      </div>
    </div>
  );
};

export default WalletPageV2;
