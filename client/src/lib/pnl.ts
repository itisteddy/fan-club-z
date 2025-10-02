/**
 * PnL (Profit and Loss) calculation utilities for predictions
 */

export interface PredictionEntry {
  id: string;
  amount: number;
  option_id: string;
  potential_payout?: number;
  actual_payout?: number;
  status: 'active' | 'won' | 'lost' | 'refunded';
}

export interface PredictionOption {
  id: string;
  label: string;
  current_odds: number;
  is_winning_outcome?: boolean;
}

export interface PnLResult {
  status: 'open' | 'won' | 'lost' | 'refunded';
  pnl: number;
  potential: number;
  stake: number;
  odds: number;
  payout: number;
}

/**
 * Calculate PnL for a single prediction entry
 */
export function calculateEntryPnL(
  entry: PredictionEntry,
  winningOptionId?: string,
  oddsMap?: Record<string, number>
): PnLResult {
  const odds = oddsMap?.[entry.option_id] ?? 1;
  const stake = entry.amount;
  
  // If prediction is still open
  if (!winningOptionId) {
    return {
      status: 'open',
      pnl: 0,
      potential: stake * odds - stake,
      stake,
      odds,
      payout: stake * odds
    };
  }
  
  // If user won
  if (entry.option_id === winningOptionId) {
    const payout = entry.actual_payout ?? (stake * odds);
    return {
      status: 'won',
      pnl: payout - stake,
      potential: payout - stake,
      stake,
      odds,
      payout
    };
  }
  
  // If user lost
  return {
    status: 'lost',
    pnl: -stake,
    potential: 0,
    stake,
    odds,
    payout: 0
  };
}

/**
 * Calculate total PnL for multiple entries
 */
export function calculateTotalPnL(
  entries: PredictionEntry[],
  winningOptionId?: string,
  oddsMap?: Record<string, number>
): {
  totalPnL: number;
  totalStake: number;
  totalPayout: number;
  winCount: number;
  lossCount: number;
  openCount: number;
  entries: PnLResult[];
} {
  const results = entries.map(entry => 
    calculateEntryPnL(entry, winningOptionId, oddsMap)
  );
  
  const totalPnL = results.reduce((sum, result) => sum + result.pnl, 0);
  const totalStake = results.reduce((sum, result) => sum + result.stake, 0);
  const totalPayout = results.reduce((sum, result) => sum + result.payout, 0);
  
  const winCount = results.filter(r => r.status === 'won').length;
  const lossCount = results.filter(r => r.status === 'lost').length;
  const openCount = results.filter(r => r.status === 'open').length;
  
  return {
    totalPnL,
    totalStake,
    totalPayout,
    winCount,
    lossCount,
    openCount,
    entries: results
  };
}

/**
 * Create odds map from prediction options
 */
export function createOddsMap(options: PredictionOption[]): Record<string, number> {
  return options.reduce((map, option) => {
    map[option.id] = option.current_odds;
    return map;
  }, {} as Record<string, number>);
}

/**
 * Get winning option ID from prediction options
 */
export function getWinningOptionId(options: PredictionOption[]): string | undefined {
  const winningOption = options.find(option => option.is_winning_outcome);
  return winningOption?.id;
}

/**
 * Format PnL for display
 */
export function formatPnL(pnl: number, options?: { showSign?: boolean; compact?: boolean }): string {
  const { showSign = true, compact = true } = options || {};
  
  if (compact) {
    const formatter = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    });
    
    const formatted = formatter.format(Math.abs(pnl));
    if (pnl === 0) return formatted;
    return showSign ? (pnl > 0 ? `+${formatted}` : `-${formatted}`) : formatted;
  }
  
  const formatter = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  
  const formatted = formatter.format(Math.abs(pnl));
  if (pnl === 0) return formatted;
  return showSign ? (pnl > 0 ? `+${formatted}` : `-${formatted}`) : formatted;
}

/**
 * Get PnL status color class
 */
export function getPnLStatusColor(status: PnLResult['status']): string {
  switch (status) {
    case 'won':
      return 'text-emerald-600';
    case 'lost':
      return 'text-red-600';
    case 'open':
      return 'text-gray-600';
    case 'refunded':
      return 'text-blue-600';
    default:
      return 'text-gray-600';
  }
}

/**
 * Get PnL status background color class
 */
export function getPnLStatusBgColor(status: PnLResult['status']): string {
  switch (status) {
    case 'won':
      return 'bg-emerald-50';
    case 'lost':
      return 'bg-red-50';
    case 'open':
      return 'bg-gray-50';
    case 'refunded':
      return 'bg-blue-50';
    default:
      return 'bg-gray-50';
  }
}
