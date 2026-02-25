// @ts-nocheck
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockMutateAsync = vi.fn();
const mockInvalidateQueries = vi.fn();
const mockRemoveQueries = vi.fn();

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<any>('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: mockInvalidateQueries,
      removeQueries: mockRemoveQueries,
    }),
  };
});

vi.mock('wagmi', () => ({
  useAccount: () => ({ address: '0xabc', isConnected: true, chainId: 84532, status: 'connected' }),
  useDisconnect: () => ({ disconnect: vi.fn() }),
  useSwitchChain: () => ({ switchChain: vi.fn() }),
}));

vi.mock('wagmi/chains', () => ({
  baseSepolia: { id: 84532 },
}));

vi.mock('@/hooks/useStableWalletConnection', () => ({
  useStableWalletConnection: () => ({
    isEffectivelyConnected: true,
    isTransitioning: false,
    address: '0xabc',
    chainId: 84532,
    status: 'connected',
  }),
}));

vi.mock('../providers/AuthSessionProvider', () => ({
  useAuthSession: () => ({
    user: { id: 'user-1' },
    session: { access_token: 'token' },
  }),
}));

vi.mock('../store/authStore', () => ({
  useAuthStore: (selector?: any) => {
    const state = { user: { id: 'user-1' }, isAuthenticated: true };
    return selector ? selector(state) : state;
  },
}));

vi.mock('zustand/react/shallow', () => ({
  useShallow: (fn: any) => fn,
}));

vi.mock('../providers/Web3Provider', () => ({
  useWeb3Recovery: () => ({ sessionHealthy: true, triggerRecovery: vi.fn() }),
}));

vi.mock('../hooks/useUnifiedBalance', () => ({
  useUnifiedBalance: () => ({
    wallet: 42,
    available: 10,
    locked: 2,
    total: 12,
    summary: {
      demoCredits: 25,
      creatorEarnings: 7.5,
      stakeBalance: 13,
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    refetchWallet: vi.fn(),
    refetchEscrow: vi.fn(),
    refetchSummary: vi.fn(),
  }),
}));

vi.mock('../hooks/useEscrowBalance', () => ({
  useEscrowBalance: () => ({ availableUSD: 10 }),
}));

vi.mock('../hooks/useWalletActivity', () => ({
  useWalletActivity: () => ({ data: { items: [] }, isLoading: false }),
}));

vi.mock('../hooks/useCreatorEarningsWallet', () => ({
  useCreatorEarningsHistory: () => ({ data: { items: [] }, isLoading: false }),
  useTransferCreatorEarnings: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

vi.mock('../hooks/useClaimableClaims', () => ({
  useClaimableClaims: () => ({ data: [] }),
}));

vi.mock('../hooks/useMerkleClaim', () => ({
  useMerkleClaim: () => ({ claim: vi.fn(), isClaiming: false }),
}));

vi.mock('../hooks/useOnchainActivity', () => ({
  useOnchainActivity: () => ({ data: [] }),
  formatActivityKind: (k: string) => k,
}));

vi.mock('../hooks/useAutoNetworkSwitch', () => ({
  useAutoNetworkSwitch: () => undefined,
}));

vi.mock('../components/layout/AppHeader', () => ({
  default: ({ title }: any) => <div>{title}</div>,
}));

vi.mock('../components/auth/SignedOutGateCard', () => ({
  default: () => <div>SignedOutGateCard</div>,
}));

vi.mock('../components/wallet/DepositUSDCModal', () => ({
  default: () => null,
}));

vi.mock('../components/wallet/WithdrawUSDCModal', () => ({
  default: () => null,
}));

vi.mock('@/lib/format', () => ({
  formatTimeAgo: () => 'just now',
  formatCurrency: (n: number) => `$${Number(n).toFixed(2)}`,
  formatLargeNumber: (n: number) => String(n),
  formatPercentage: (n: number) => `${n}%`,
}));

vi.mock('@/lib/lexicon', () => ({
  t: (s: string) => s,
}));

vi.mock('@/utils/walletStatus', () => ({
  computeWalletStatus: () => ({ code: 'ready' }),
}));

vi.mock('../auth/authGateAdapter', () => ({
  openAuthGate: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/wallet', search: '', hash: '' }),
  };
});

vi.mock('../hooks/useWalletConnectSession', () => ({}));

import WalletPageV2 from '../WalletPageV2';

describe('WalletPageV2 creator earnings smoke', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync.mockResolvedValue({
      balances: { demoCredits: 25, creatorEarnings: 2.5, stakeBalance: 18 },
      transactionId: 'tx_1',
    });
  });

  it('renders distinct Demo Credits, Wallet/Stake Balance, and Creator Earnings', async () => {
    render(<WalletPageV2 />);

    expect(await screen.findByText('Creator Earnings')).toBeInTheDocument();
    expect(screen.getByText('Internal Balances')).toBeInTheDocument();
    expect(screen.getByText('Demo Credits')).toBeInTheDocument();
    expect(screen.getByText('Wallet / Stake Balance')).toBeInTheDocument();
  });

  it('opens move-to-balance sheet and submits transfer', async () => {
    render(<WalletPageV2 />);

    fireEvent.click(await screen.findByRole('button', { name: /move to balance/i }));

    expect(await screen.findByText('Move to Balance')).toBeInTheDocument();
    const input = screen.getByPlaceholderText('0.00');
    fireEvent.change(input, { target: { value: '5.00' } });
    fireEvent.click(screen.getByRole('button', { name: /confirm move/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(5);
    });
  });
});

