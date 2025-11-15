# Complete Architecture Cleanup & Improvement Plan
## Fan Club Z - Onchain Payment & Prediction Platform

---

## Executive Summary

Your platform has fundamental architectural issues mixing database-stored balances with on-chain data, incomplete settlement flows, and inconsistent UI/UX. This plan provides a complete overhaul to make the system production-ready.

### Critical Issues Identified

1. **Dual Balance Systems**: Database `wallets` table vs on-chain Escrow contract
2. **No Settlement Flow**: Winners don't receive payouts
3. **Orphaned Locks**: Failed transactions leave permanent locks
4. **Inconsistent UI**: Different balance displays across pages
5. **Missing Real-time Updates**: No WebSocket/polling for balance changes
6. **No Idempotency**: Double-clicks create duplicate transactions
7. **Wrong Onboarding Flow**: Users confused about wallet connection timing

---

## Phase 1: Balance Architecture Cleanup (Priority: CRITICAL)

### Problem
- `useWalletSummary` returns database-calculated balances
- Multiple sources of truth for user funds
- Escrow locks in database never expire or get consumed

### Solution Architecture

```
┌──────────────────────────────────────────┐
│           USER WALLET (MetaMask)         │
│                                          │
│  USDC Balance: ERC20.balanceOf(user)    │
└────────────────┬─────────────────────────┘
                 │ deposit(amount)
                 ▼
┌──────────────────────────────────────────┐
│         ESCROW CONTRACT (On-chain)       │
│                                          │
│  available[user]: Ready for betting      │
│  locked[user]: Currently in predictions  │
│  stakes[predId][user]: Per-prediction   │
└────────────────┬─────────────────────────┘
                 │ Events emitted
                 ▼
┌──────────────────────────────────────────┐
│      DATABASE (Transaction Log Only)     │
│                                          │
│  wallet_transactions: History            │
│  prediction_entries: Bet details         │
│  ❌ NO balance calculations here         │
└──────────────────────────────────────────┘
```

### Implementation Steps

#### 1.1 Remove Database Balance Dependencies

```typescript
// ❌ OLD - client/src/hooks/useWalletSummary.ts
export function useWalletSummary() {
  // DEPRECATE THIS ENTIRELY
  console.warn('useWalletSummary is deprecated. Use useEscrowBalance() instead');
  return null;
}

// ✅ NEW - client/src/hooks/useUnifiedBalance.ts
import { useEscrowBalance } from './useEscrowBalance';
import { useUSDCBalance } from './useUSDCBalance';

export function useUnifiedBalance() {
  const { balance: walletUSDC, isLoading: walletLoading } = useUSDCBalance();
  const { 
    availableUSD, 
    reservedUSD, 
    totalUSD,
    isLoading: escrowLoading 
  } = useEscrowBalance();

  return {
    wallet: walletUSDC || 0,
    available: availableUSD || 0,
    locked: reservedUSD || 0,
    total: totalUSD || 0,
    isLoading: walletLoading || escrowLoading
  };
}
```

#### 1.2 Update Wallet Page UI

```tsx
// client/src/pages/WalletPageV2.tsx
const WalletPageV2 = () => {
  const { wallet, available, locked, total, isLoading } = useUnifiedBalance();
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Simplified, clear cards */}
      <BalanceCard
        title="Wallet Balance"
        amount={wallet}
        subtitle="USDC on Base Sepolia"
        icon={<Wallet />}
        loading={isLoading}
        actions={[
          <Button onClick={() => setShowDeposit(true)}>
            Deposit to Platform
          </Button>
        ]}
      />
      
      <BalanceCard
        title="Platform Balance"
        amount={available}
        subtitle={`${locked} USDC locked in predictions`}
        icon={<DollarSign />}
        loading={isLoading}
        actions={[
          locked > 0 && <Badge>Active Predictions</Badge>,
          <Button onClick={() => setShowWithdraw(true)}>
            Withdraw
          </Button>
        ]}
      />
    </div>
  );
};
```

#### 1.3 Fix Prediction Details Page

```tsx
// client/src/pages/PredictionDetailsPageV2.tsx
const PredictionDetailsPage = () => {
  const { available, isLoading } = useUnifiedBalance();
  const [stakeAmount, setStakeAmount] = useState('');
  
  // Validate stake amount against on-chain balance
  const canStake = !isLoading && parseFloat(stakeAmount) <= available;
  
  return (
    <>
      {/* Show available balance prominently */}
      <div className="bg-gray-900 p-4 rounded-lg mb-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Available to Stake</span>
          <span className="text-2xl font-bold text-green-400">
            ${formatCurrency(available)}
          </span>
        </div>
        {available === 0 && (
          <Button onClick={() => setShowDeposit(true)} className="mt-2 w-full">
            Deposit USDC to Start Betting
          </Button>
        )}
      </div>
      
      {/* Stake input with validation */}
      <StakeInput
        value={stakeAmount}
        onChange={setStakeAmount}
        max={available}
        error={!canStake && stakeAmount ? 'Insufficient balance' : undefined}
      />
    </>
  );
};
```

---

## Phase 2: Complete Settlement Implementation (Priority: CRITICAL)

### Problem
- No on-chain settlement mechanism
- Winners don't receive payouts
- Locks never get released

### Solution: Full Settlement Flow

#### 2.1 Smart Contract Settlement Function

```solidity
// fanclubz-contracts/src/EscrowUSDCUpgradeable.sol
contract EscrowUSDCUpgradeable {
    // Add batch settlement for efficiency
    function settlePrediction(
        bytes32 predictionId,
        address[] calldata winners,
        uint256[] calldata payouts,
        address[] calldata losers
    ) external onlyRole(ORACLE_ROLE) {
        require(winners.length == payouts.length, "Array mismatch");
        
        // Process winners
        for (uint i = 0; i < winners.length; i++) {
            uint256 stake = stakes[predictionId][winners[i]];
            require(stake > 0, "No stake found");
            
            // Unlock stake and add payout
            stakes[predictionId][winners[i]] = 0;
            locked[winners[i]] -= stake;
            available[winners[i]] += payouts[i];
            
            emit StakeUnlocked(winners[i], predictionId, stake, payouts[i], keccak256("WIN"));
        }
        
        // Process losers (just unlock, no payout)
        for (uint i = 0; i < losers.length; i++) {
            uint256 stake = stakes[predictionId][losers[i]];
            if (stake > 0) {
                stakes[predictionId][losers[i]] = 0;
                locked[losers[i]] -= stake;
                
                emit StakeUnlocked(losers[i], predictionId, stake, 0, keccak256("LOSS"));
            }
        }
    }
}
```

#### 2.2 Server Settlement Endpoint

```typescript
// server/src/routes/settlement.ts
router.post('/settle/:predictionId', authenticate, async (req, res) => {
  const { predictionId } = req.params;
  const { winningOptionId } = req.body;
  
  try {
    // 1. Validate prediction can be settled
    const prediction = await db.predictions.findUnique({
      where: { id: predictionId },
      include: {
        options: true,
        entries: {
          include: { user: true }
        }
      }
    });
    
    if (!prediction || prediction.status !== 'open') {
      throw new Error('Invalid prediction state');
    }
    
    // 2. Calculate payouts
    const totalPool = prediction.entries.reduce((sum, e) => sum + e.amount, 0);
    const platformFee = totalPool * 0.025; // 2.5%
    const creatorFee = totalPool * 0.01;   // 1%
    const payoutPool = totalPool - platformFee - creatorFee;
    
    const winners = prediction.entries.filter(e => e.option_id === winningOptionId);
    const losers = prediction.entries.filter(e => e.option_id !== winningOptionId);
    const winnerStake = winners.reduce((sum, w) => sum + w.amount, 0);
    
    // 3. Calculate individual payouts
    const payouts = winners.map(winner => {
      const sharePercent = winner.amount / winnerStake;
      const payout = winner.amount + (payoutPool - winnerStake) * sharePercent;
      return {
        address: winner.user.wallet_address,
        amount: Math.floor(payout * 1e6), // Convert to USDC decimals
        originalStake: Math.floor(winner.amount * 1e6)
      };
    });
    
    // 4. Call smart contract
    const contract = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, signer);
    const predictionHash = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(predictionId)
    );
    
    const tx = await contract.settlePrediction(
      predictionHash,
      payouts.map(p => p.address),
      payouts.map(p => p.amount),
      losers.map(l => l.user.wallet_address)
    );
    
    await tx.wait();
    
    // 5. Record in database
    await db.$transaction([
      // Update prediction status
      db.predictions.update({
        where: { id: predictionId },
        data: { 
          status: 'settled',
          winning_option_id: winningOptionId,
          settled_at: new Date(),
          settlement_tx_hash: tx.hash
        }
      }),
      
      // Record payouts
      ...payouts.map(payout => 
        db.wallet_transactions.create({
          data: {
            user_id: payout.userId,
            type: 'payout',
            amount: payout.amount / 1e6, // Convert back to dollars
            direction: 'credit',
            status: 'completed',
            tx_hash: tx.hash,
            metadata: {
              prediction_id: predictionId,
              original_stake: payout.originalStake / 1e6
            }
          }
        })
      ),
      
      // Update entries
      db.prediction_entries.updateMany({
        where: { prediction_id: predictionId },
        data: { status: 'settled' }
      })
    ]);
    
    // 6. Emit real-time events
    emitSettlementComplete(predictionId, {
      winners: payouts.length,
      totalPayout: payouts.reduce((sum, p) => sum + p.amount, 0) / 1e6
    });
    
    return res.json({ 
      success: true, 
      txHash: tx.hash,
      payouts: payouts.length 
    });
    
  } catch (error) {
    console.error('Settlement failed:', error);
    return res.status(500).json({ error: error.message });
  }
});
```

#### 2.3 Client Settlement UI

```tsx
// client/src/components/settlement/SettlementButton.tsx
export const SettlementButton = ({ prediction }) => {
  const [isSettling, setIsSettling] = useState(false);
  const { refetch: refetchBalance } = useUnifiedBalance();
  
  const handleSettle = async (winningOptionId: string) => {
    setIsSettling(true);
    try {
      const res = await fetch(`/api/settlement/settle/${prediction.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winningOptionId })
      });
      
      if (!res.ok) throw new Error('Settlement failed');
      
      const { txHash } = await res.json();
      
      toast.success(
        <div>
          <p>Settlement complete!</p>
          <a 
            href={`https://sepolia.basescan.org/tx/${txHash}`}
            target="_blank"
            className="text-blue-400 underline"
          >
            View transaction
          </a>
        </div>
      );
      
      // Refresh balances after settlement
      setTimeout(() => refetchBalance(), 3000);
      
    } catch (error) {
      toast.error(`Settlement failed: ${error.message}`);
    } finally {
      setIsSettling(false);
    }
  };
  
  return (
    <Button 
      onClick={() => handleSettle(selectedOption)}
      disabled={isSettling}
      loading={isSettling}
    >
      {isSettling ? 'Processing Settlement...' : 'Settle Prediction'}
    </Button>
  );
};
```

---

## Phase 3: Transaction Idempotency & Error Recovery (Priority: HIGH)

### Problem
- Double-clicks create duplicate transactions
- Failed transactions leave orphaned locks
- No rollback mechanism

### Solution: Idempotent Transaction System

#### 3.1 Idempotency Keys

```typescript
// server/src/middleware/idempotency.ts
export const idempotency = () => {
  return async (req, res, next) => {
    const idempotencyKey = req.headers['x-idempotency-key'];
    
    if (!idempotencyKey) {
      return res.status(400).json({ 
        error: 'x-idempotency-key header required' 
      });
    }
    
    // Check if we've seen this key before
    const existing = await db.idempotency_keys.findUnique({
      where: { key: idempotencyKey }
    });
    
    if (existing) {
      // Return cached response
      return res.status(existing.status_code).json(existing.response);
    }
    
    // Store the key to prevent concurrent duplicates
    await db.idempotency_keys.create({
      data: {
        key: idempotencyKey,
        status: 'processing',
        created_at: new Date()
      }
    });
    
    // Capture the response
    const originalSend = res.json;
    res.json = function(data) {
      // Store response for future duplicate requests
      db.idempotency_keys.update({
        where: { key: idempotencyKey },
        data: {
          status: 'completed',
          status_code: res.statusCode,
          response: data
        }
      });
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};

// Use in routes
router.post('/place-bet', idempotency(), async (req, res) => {
  // Bet placement logic
});
```

#### 3.2 Client-Side Idempotency

```typescript
// client/src/hooks/useIdempotentRequest.ts
import { v4 as uuidv4 } from 'uuid';

export function useIdempotentRequest() {
  const [pending, setPending] = useState<Set<string>>(new Set());
  
  const execute = useCallback(async (
    url: string, 
    options: RequestInit,
    key?: string
  ) => {
    const idempotencyKey = key || uuidv4();
    
    // Prevent duplicate in-flight requests
    if (pending.has(idempotencyKey)) {
      console.warn('Request already in progress:', idempotencyKey);
      return null;
    }
    
    setPending(prev => new Set(prev).add(idempotencyKey));
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'x-idempotency-key': idempotencyKey
        }
      });
      
      return response;
    } finally {
      setPending(prev => {
        const next = new Set(prev);
        next.delete(idempotencyKey);
        return next;
      });
    }
  }, [pending]);
  
  return { execute, isPending: pending.size > 0 };
}
```

#### 3.3 Transaction Rollback

```typescript
// server/src/services/transactionRollback.ts
export class TransactionRollback {
  private operations: Array<() => Promise<void>> = [];
  
  addRollback(operation: () => Promise<void>) {
    this.operations.push(operation);
  }
  
  async execute() {
    // Execute rollbacks in reverse order
    for (const op of this.operations.reverse()) {
      try {
        await op();
      } catch (error) {
        console.error('Rollback failed:', error);
        // Continue with other rollbacks
      }
    }
  }
}

// Usage in bet placement
router.post('/place-bet', async (req, res) => {
  const rollback = new TransactionRollback();
  
  try {
    // 1. Lock funds on-chain
    const lockTx = await escrowContract.lockStake(predictionId, amount);
    await lockTx.wait();
    
    rollback.addRollback(async () => {
      // Unlock if something fails
      const unlockTx = await escrowContract.unlockStake(predictionId, amount);
      await unlockTx.wait();
    });
    
    // 2. Create database entry
    const entry = await db.prediction_entries.create({
      data: { /* ... */ }
    });
    
    rollback.addRollback(async () => {
      await db.prediction_entries.delete({ where: { id: entry.id } });
    });
    
    // 3. Update pool total
    await db.predictions.update({
      where: { id: predictionId },
      data: { pool_total: { increment: amount } }
    });
    
    // Success - no rollback needed
    return res.json({ success: true, entryId: entry.id });
    
  } catch (error) {
    // Something failed - rollback everything
    await rollback.execute();
    return res.status(500).json({ error: 'Transaction failed and was rolled back' });
  }
});
```

---

## Phase 4: Real-Time Updates & Optimistic UI (Priority: HIGH)

### Problem
- Users don't see balance updates immediately
- No feedback during transactions
- UI shows $0 before data loads

### Solution: WebSocket + Optimistic Updates

#### 4.1 WebSocket Implementation

```typescript
// server/src/services/websocket.ts
import { Server } from 'socket.io';

export class RealtimeService {
  private io: Server;
  
  constructor(server: http.Server) {
    this.io = new Server(server, {
      cors: { origin: process.env.CLIENT_URL }
    });
    
    this.io.on('connection', (socket) => {
      socket.on('subscribe:wallet', (userId: string) => {
        socket.join(`wallet:${userId}`);
      });
      
      socket.on('subscribe:prediction', (predictionId: string) => {
        socket.join(`prediction:${predictionId}`);
      });
    });
  }
  
  // Emit balance updates
  emitBalanceUpdate(userId: string, balances: any) {
    this.io.to(`wallet:${userId}`).emit('balance:update', balances);
  }
  
  // Emit prediction updates
  emitPredictionUpdate(predictionId: string, data: any) {
    this.io.to(`prediction:${predictionId}`).emit('prediction:update', data);
  }
  
  // Emit transaction status
  emitTransactionStatus(userId: string, txId: string, status: string) {
    this.io.to(`wallet:${userId}`).emit('transaction:status', { txId, status });
  }
}
```

#### 4.2 Client WebSocket Hook

```typescript
// client/src/hooks/useRealtimeUpdates.ts
export function useRealtimeUpdates() {
  const queryClient = useQueryClient();
  const { user } = useAuthSession();
  
  useEffect(() => {
    if (!user?.id) return;
    
    const socket = io(process.env.REACT_APP_WS_URL);
    
    // Subscribe to user's wallet updates
    socket.emit('subscribe:wallet', user.id);
    
    // Handle balance updates
    socket.on('balance:update', (balances) => {
      // Update React Query cache
      queryClient.setQueryData(
        ['escrowBalance', user.wallet_address],
        balances
      );
    });
    
    // Handle transaction status updates
    socket.on('transaction:status', ({ txId, status }) => {
      if (status === 'completed') {
        // Refetch all balance data
        queryClient.invalidateQueries(['escrowBalance']);
        queryClient.invalidateQueries(['usdcBalance']);
        
        toast.success('Transaction confirmed!');
      }
    });
    
    return () => {
      socket.disconnect();
    };
  }, [user?.id, queryClient]);
}
```

#### 4.3 Optimistic Updates

```typescript
// client/src/hooks/useOptimisticBalance.ts
export function useOptimisticBalance() {
  const { available, locked } = useUnifiedBalance();
  const [optimisticState, setOptimisticState] = useState<{
    available: number;
    locked: number;
    pending: Map<string, number>;
  }>({
    available,
    locked,
    pending: new Map()
  });
  
  const placeBetOptimistic = useCallback(async (amount: number, predictionId: string) => {
    const txId = uuidv4();
    
    // Optimistically update UI
    setOptimisticState(prev => ({
      available: prev.available - amount,
      locked: prev.locked + amount,
      pending: new Map(prev.pending).set(txId, amount)
    }));
    
    try {
      const response = await fetch('/api/place-bet', {
        method: 'POST',
        body: JSON.stringify({ amount, predictionId }),
        headers: {
          'Content-Type': 'application/json',
          'x-idempotency-key': txId
        }
      });
      
      if (!response.ok) throw new Error('Bet failed');
      
      // Remove from pending on success
      setOptimisticState(prev => {
        const pending = new Map(prev.pending);
        pending.delete(txId);
        return { ...prev, pending };
      });
      
    } catch (error) {
      // Revert optimistic update on failure
      setOptimisticState(prev => ({
        available: prev.available + amount,
        locked: prev.locked - amount,
        pending: new Map(prev.pending)
      }));
      
      throw error;
    }
  }, []);
  
  return {
    available: optimisticState.available,
    locked: optimisticState.locked,
    hasPending: optimisticState.pending.size > 0,
    placeBetOptimistic
  };
}
```

---

## Phase 5: Improved Onboarding & Error Handling (Priority: HIGH)

### Problem
- Confusing wallet connection flow
- Poor error messages
- No guidance for new users

### Solution: Smart Onboarding Flow

#### 5.1 Progressive Onboarding

```tsx
// client/src/components/onboarding/SmartOnboarding.tsx
export const SmartOnboarding = () => {
  const { isConnected, address } = useAccount();
  const { balance: walletUSDC } = useUSDCBalance();
  const { availableUSD } = useEscrowBalance();
  const [step, setStep] = useState<'connect' | 'fund-wallet' | 'deposit' | 'ready'>('connect');
  
  useEffect(() => {
    if (!isConnected) {
      setStep('connect');
    } else if (walletUSDC === 0) {
      setStep('fund-wallet');
    } else if (availableUSD === 0) {
      setStep('deposit');
    } else {
      setStep('ready');
    }
  }, [isConnected, walletUSDC, availableUSD]);
  
  return (
    <div className="bg-gradient-to-r from-purple-900 to-blue-900 p-6 rounded-xl">
      <div className="flex items-center gap-4 mb-4">
        <StepIndicator 
          steps={['Connect', 'Fund Wallet', 'Deposit', 'Start Betting']}
          current={step}
        />
      </div>
      
      {step === 'connect' && (
        <div className="text-center">
          <h3 className="text-xl font-bold mb-2">Welcome to FanClubZ!</h3>
          <p className="text-gray-300 mb-4">
            Connect your wallet to start making predictions
          </p>
          <ConnectButton className="w-full" />
        </div>
      )}
      
      {step === 'fund-wallet' && (
        <div className="text-center">
          <h3 className="text-xl font-bold mb-2">Get USDC on Base Sepolia</h3>
          <p className="text-gray-300 mb-4">
            You need USDC to make predictions. Get test USDC from our faucet.
          </p>
          <Button 
            onClick={() => window.open('https://faucet.circle.com/', '_blank')}
            className="w-full"
          >
            Get Test USDC
          </Button>
          <p className="text-xs text-gray-400 mt-2">
            Make sure to select Base Sepolia network
          </p>
        </div>
      )}
      
      {step === 'deposit' && (
        <div className="text-center">
          <h3 className="text-xl font-bold mb-2">Deposit USDC to Platform</h3>
          <p className="text-gray-300 mb-4">
            Transfer USDC from your wallet to the platform to start betting
          </p>
          <p className="text-sm text-gray-400 mb-4">
            Wallet Balance: ${formatCurrency(walletUSDC)}
          </p>
          <DepositButton amount={walletUSDC} />
        </div>
      )}
      
      {step === 'ready' && (
        <div className="text-center">
          <h3 className="text-xl font-bold mb-2">You're Ready! 🎉</h3>
          <p className="text-gray-300 mb-4">
            Available to bet: ${formatCurrency(availableUSD)}
          </p>
          <Button 
            onClick={() => navigate('/predictions')}
            className="w-full"
          >
            Browse Predictions
          </Button>
        </div>
      )}
    </div>
  );
};
```

#### 5.2 Comprehensive Error Handling

```typescript
// client/src/hooks/useErrorHandler.ts
export function useErrorHandler() {
  const handleError = useCallback((error: any, context?: string) => {
    console.error(`Error in ${context}:`, error);
    
    // Parse different error types
    if (error?.code === 4001) {
      // User rejected transaction
      toast.error('Transaction cancelled by user');
    } else if (error?.code === -32603) {
      // Internal JSON-RPC error
      toast.error('Wallet error. Please try again.');
    } else if (error?.message?.includes('insufficient funds')) {
      toast.error(
        <div>
          <p className="font-bold">Insufficient funds</p>
          <p className="text-sm">You need more USDC to complete this transaction</p>
          <Button size="sm" onClick={() => window.open('/wallet', '_self')}>
            Add Funds
          </Button>
        </div>
      );
    } else if (error?.message?.includes('network')) {
      toast.error(
        <div>
          <p className="font-bold">Wrong Network</p>
          <p className="text-sm">Please switch to Base Sepolia</p>
        </div>
      );
    } else if (error?.message?.includes('locked')) {
      toast.error('These funds are locked in an active prediction');
    } else {
      // Generic error
      toast.error(error?.message || 'Something went wrong. Please try again.');
    }
    
    // Log to error tracking service
    if (window.Sentry) {
      window.Sentry.captureException(error, {
        tags: { context }
      });
    }
  }, []);
  
  return { handleError };
}
```

---

## Phase 6: Mobile & UI/UX Improvements (Priority: MEDIUM)

### Problem
- Mobile layout broken
- Inconsistent loading states
- Cluttered transaction history

### Solution: Responsive & Clean UI

#### 6.1 Mobile-First Balance Display

```tsx
// client/src/components/wallet/MobileWalletView.tsx
export const MobileWalletView = () => {
  const { available, locked, isLoading } = useUnifiedBalance();
  const [activeView, setActiveView] = useState<'balance' | 'activity'>('balance');
  
  return (
    <div className="min-h-screen bg-black">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-black border-b border-gray-800">
        <div className="p-4">
          <div className="text-center mb-4">
            <div className="text-sm text-gray-400">Available Balance</div>
            <div className="text-3xl font-bold text-white">
              {isLoading ? (
                <Skeleton className="h-10 w-32 mx-auto" />
              ) : (
                `$${formatCurrency(available)}`
              )}
            </div>
            {locked > 0 && (
              <div className="text-xs text-yellow-400 mt-1">
                ${formatCurrency(locked)} locked
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button 
              onClick={() => setShowDeposit(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              Deposit
            </Button>
            <Button 
              onClick={() => setShowWithdraw(true)}
              variant="outline"
            >
              <Download className="h-4 w-4 mr-1" />
              Withdraw
            </Button>
          </div>
        </div>
        
        {/* Tab Switcher */}
        <div className="flex border-t border-gray-800">
          <button
            onClick={() => setActiveView('balance')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeView === 'balance' 
                ? 'text-white border-b-2 border-purple-500' 
                : 'text-gray-400'
            }`}
          >
            Balance
          </button>
          <button
            onClick={() => setActiveView('activity')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeView === 'activity' 
                ? 'text-white border-b-2 border-purple-500' 
                : 'text-gray-400'
            }`}
          >
            Activity
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4">
        {activeView === 'balance' && <BalanceDetails />}
        {activeView === 'activity' && <CompactActivityFeed />}
      </div>
    </div>
  );
};
```

#### 6.2 Improved Activity Feed

```tsx
// client/src/components/activity/ImprovedActivityFeed.tsx
export const ImprovedActivityFeed = () => {
  const { data: activities, isLoading } = useWalletActivity();
  
  // Group activities by date
  const groupedActivities = useMemo(() => {
    if (!activities) return {};
    
    return activities.reduce((groups, activity) => {
      const date = format(new Date(activity.created_at), 'MMM dd, yyyy');
      if (!groups[date]) groups[date] = [];
      groups[date].push(activity);
      return groups;
    }, {} as Record<string, Activity[]>);
  }, [activities]);
  
  const getIcon = (type: string) => {
    switch (type) {
      case 'deposit': return <ArrowDown className="text-green-500" />;
      case 'withdraw': return <ArrowUp className="text-blue-500" />;
      case 'bet_placed': return <Target className="text-purple-500" />;
      case 'payout': return <Trophy className="text-yellow-500" />;
      default: return <DollarSign className="text-gray-500" />;
    }
  };
  
  const getDescription = (activity: Activity) => {
    switch (activity.type) {
      case 'deposit':
        return `Deposited from wallet`;
      case 'withdraw':
        return `Withdrew to wallet`;
      case 'bet_placed':
        return `Placed bet on "${activity.metadata?.prediction_title}"`;
      case 'payout':
        return `Won ${activity.metadata?.prediction_title}`;
      default:
        return activity.description;
    }
  };
  
  if (isLoading) {
    return <ActivitySkeleton />;
  }
  
  return (
    <div className="space-y-6">
      {Object.entries(groupedActivities).map(([date, activities]) => (
        <div key={date}>
          <h3 className="text-sm font-medium text-gray-400 mb-3">{date}</h3>
          <div className="space-y-2">
            {activities.map((activity) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-4 bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-800 rounded-full">
                    {getIcon(activity.type)}
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {getDescription(activity)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {format(new Date(activity.created_at), 'h:mm a')}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className={`font-bold ${
                    activity.direction === 'credit' 
                      ? 'text-green-400' 
                      : 'text-gray-300'
                  }`}>
                    {activity.direction === 'credit' ? '+' : '-'}
                    ${formatCurrency(activity.amount)}
                  </p>
                  {activity.tx_hash && (
                    <a
                      href={`https://sepolia.basescan.org/tx/${activity.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:underline"
                    >
                      View tx
                    </a>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ))}
      
      {Object.keys(groupedActivities).length === 0 && (
        <EmptyState
          icon={<Clock />}
          title="No activity yet"
          description="Your transaction history will appear here"
        />
      )}
    </div>
  );
};
```

#### 6.3 Loading States & Skeletons

```tsx
// client/src/components/ui/BalanceSkeleton.tsx
export const BalanceSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-8 bg-gray-800 rounded w-24 mb-2"></div>
    <div className="h-12 bg-gray-700 rounded w-32"></div>
  </div>
);

// Use throughout the app
const WalletBalance = () => {
  const { available, isLoading } = useUnifiedBalance();
  
  if (isLoading) {
    return <BalanceSkeleton />;
  }
  
  return (
    <div className="text-2xl font-bold">
      ${formatCurrency(available)}
    </div>
  );
};
```

---

## Phase 7: Database Schema Updates (Priority: HIGH)

### SQL Migrations Required

```sql
-- 001_remove_wallet_balances.sql
-- Remove balance columns from wallets table (use on-chain only)
ALTER TABLE wallets 
DROP COLUMN IF EXISTS available_balance,
DROP COLUMN IF EXISTS reserved_balance,
DROP COLUMN IF EXISTS total_balance;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_wallets_address ON wallets(wallet_address);

-- 002_add_idempotency_table.sql
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key VARCHAR(255) PRIMARY KEY,
  status VARCHAR(50) NOT NULL DEFAULT 'processing',
  status_code INTEGER,
  response JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_idempotency_created ON idempotency_keys(created_at);

-- Clean up old keys after 24 hours
CREATE OR REPLACE FUNCTION cleanup_old_idempotency_keys()
RETURNS void AS $$
BEGIN
  DELETE FROM idempotency_keys 
  WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- 003_add_settlement_fields.sql
ALTER TABLE predictions
ADD COLUMN IF NOT EXISTS settlement_tx_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS settled_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS settlement_metadata JSONB;

ALTER TABLE prediction_entries
ADD COLUMN IF NOT EXISTS actual_payout DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS payout_tx_hash VARCHAR(255);

-- 004_improve_wallet_transactions.sql
ALTER TABLE wallet_transactions
ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS prediction_id UUID REFERENCES predictions(id),
ADD COLUMN IF NOT EXISTS entry_id UUID REFERENCES prediction_entries(id),
ADD COLUMN IF NOT EXISTS gas_used DECIMAL(10, 6),
ADD COLUMN IF NOT EXISTS gas_price DECIMAL(10, 6);

CREATE INDEX idx_wallet_transactions_prediction ON wallet_transactions(prediction_id);
CREATE INDEX idx_wallet_transactions_user_type ON wallet_transactions(user_id, type);

-- 005_add_realtime_subscriptions.sql
CREATE TABLE IF NOT EXISTS realtime_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  socket_id VARCHAR(255) NOT NULL,
  channel VARCHAR(100) NOT NULL,
  subscribed_at TIMESTAMP DEFAULT NOW(),
  last_ping TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_realtime_subs_user ON realtime_subscriptions(user_id);
CREATE INDEX idx_realtime_subs_socket ON realtime_subscriptions(socket_id);
```

---

## Phase 8: Testing & Monitoring (Priority: MEDIUM)

### Testing Strategy

```typescript
// client/src/tests/integration/settlement.test.ts
describe('Settlement Flow', () => {
  it('should properly distribute payouts to winners', async () => {
    // 1. Create prediction with 2 options
    const prediction = await createTestPrediction();
    
    // 2. Place bets
    await placeBet(user1, prediction.id, option1.id, 100);
    await placeBet(user2, prediction.id, option1.id, 50);
    await placeBet(user3, prediction.id, option2.id, 75);
    
    // 3. Settle prediction
    await settlePrediction(prediction.id, option1.id);
    
    // 4. Verify payouts
    const user1Balance = await getEscrowBalance(user1.address);
    const user2Balance = await getEscrowBalance(user2.address);
    const user3Balance = await getEscrowBalance(user3.address);
    
    // Winners should receive proportional payouts
    expect(user1Balance.available).toBeCloseTo(100 + (75 * 0.975 * (100/150)), 2);
    expect(user2Balance.available).toBeCloseTo(50 + (75 * 0.975 * (50/150)), 2);
    
    // Loser gets nothing back
    expect(user3Balance.available).toBe(0);
    expect(user3Balance.locked).toBe(0);
  });
  
  it('should handle settlement rollback on failure', async () => {
    // Test rollback mechanism
  });
});
```

### Monitoring Setup

```typescript
// server/src/monitoring/metrics.ts
import { Registry, Counter, Histogram } from 'prom-client';

const register = new Registry();

export const metrics = {
  deposits: new Counter({
    name: 'fcz_deposits_total',
    help: 'Total number of deposits',
    labelNames: ['status'],
    registers: [register]
  }),
  
  settlements: new Counter({
    name: 'fcz_settlements_total',
    help: 'Total number of settlements',
    labelNames: ['status'],
    registers: [register]
  }),
  
  settlementDuration: new Histogram({
    name: 'fcz_settlement_duration_seconds',
    help: 'Settlement processing time',
    registers: [register]
  }),
  
  balanceMismatch: new Counter({
    name: 'fcz_balance_mismatch_total',
    help: 'Number of balance mismatches detected',
    registers: [register]
  })
};

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    // Check database
    await db.$queryRaw`SELECT 1`;
    
    // Check blockchain connection
    const blockNumber = await provider.getBlockNumber();
    
    // Check escrow contract
    const escrowAddress = await escrowContract.address;
    
    res.json({
      status: 'healthy',
      checks: {
        database: 'ok',
        blockchain: { status: 'ok', blockNumber },
        escrow: { status: 'ok', address: escrowAddress }
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

---

## Implementation Timeline

### Week 1: Critical Fixes
- [ ] Day 1-2: Remove database balance dependencies
- [ ] Day 3-4: Implement on-chain settlement
- [ ] Day 5: Add idempotency middleware

### Week 2: Core Features
- [ ] Day 1-2: WebSocket real-time updates
- [ ] Day 3-4: Transaction rollback mechanism
- [ ] Day 5: Optimistic UI updates

### Week 3: UX Improvements
- [ ] Day 1-2: Smart onboarding flow
- [ ] Day 3-4: Mobile responsive design
- [ ] Day 5: Improved error handling

### Week 4: Testing & Launch
- [ ] Day 1-2: Integration testing
- [ ] Day 3: Load testing
- [ ] Day 4: Monitoring setup
- [ ] Day 5: Production deployment

---

## Success Metrics

1. **Technical Metrics**
   - Zero balance mismatches
   - < 5s settlement processing time
   - 99.9% transaction success rate
   - Zero orphaned locks

2. **User Experience Metrics**
   - < 3 clicks to place first bet
   - < 2s balance update after transaction
   - 90% successful onboarding completion
   - < 1% user-reported balance issues

3. **Business Metrics**
   - 50% reduction in support tickets
   - 30% increase in bet placement
   - 25% increase in user retention

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Database migrations tested
- [ ] Smart contract audited
- [ ] Load testing completed
- [ ] Rollback plan ready

### Deployment
- [ ] Deploy smart contract upgrades
- [ ] Run database migrations
- [ ] Deploy server with new endpoints
- [ ] Deploy client with new UI
- [ ] Enable WebSocket connections

### Post-Deployment
- [ ] Monitor error rates
- [ ] Check balance consistency
- [ ] Verify settlement flow
- [ ] Monitor user feedback
- [ ] Be ready to rollback if needed

---

## Emergency Procedures

### If Balance Mismatch Detected
1. Pause deposits/withdrawals
2. Run reconciliation script
3. Identify root cause
4. Fix and verify
5. Resume operations

### If Settlement Fails
1. Revert prediction status
2. Unlock all stakes
3. Notify affected users
4. Manual settlement if needed
5. Post-mortem analysis

### If Double-Spend Detected
1. Pause all operations
2. Audit transaction logs
3. Identify exploit
4. Patch vulnerability
5. Compensate affected users

---

## Conclusion

This comprehensive plan addresses all identified issues in your payment architecture. The key principles are:

1. **On-chain as source of truth** - Database is only for history
2. **Idempotent operations** - Prevent duplicates
3. **Complete settlement flow** - Winners get paid
4. **Real-time updates** - Users see changes immediately
5. **Clear UX** - No confusion about balances
6. **Robust error handling** - Graceful failures

Implement in phases, test thoroughly, and monitor closely. This will transform your platform into a production-ready system with excellent user experience.
