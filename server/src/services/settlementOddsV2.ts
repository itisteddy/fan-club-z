/**
 * Pool V2 settlement: cents-based payout allocation using shared odds engine.
 * Used when predictions.odds_model === 'pool_v2'. Legacy predictions are unchanged.
 */

import { computePayoutMultiple } from '@fanclubz/shared';

export type PoolV2SettlementTotals = {
  multiple: number;
  distributableCents: number;
  platformFeeCents: number;
  creatorFeeCents: number;
};

/**
 * Compute settlement totals for pool_v2: fees from losing pool, distributable to winners.
 */
export function computePoolV2SettlementTotals(args: {
  winningPoolCents: number;
  losingPoolCents: number;
  platformFeeBps: number;
  creatorFeeBps: number;
}): PoolV2SettlementTotals | null {
  const { winningPoolCents, losingPoolCents, platformFeeBps, creatorFeeBps } = args;
  if (winningPoolCents <= 0) return null;

  const multiple = computePayoutMultiple({
    selectedPoolCents: winningPoolCents,
    otherPoolCents: losingPoolCents,
    platformFeeBps,
    creatorFeeBps,
  });
  if (multiple == null) return null;

  const platformFeeCents = Math.floor((losingPoolCents * platformFeeBps) / 10_000);
  const creatorFeeCents = Math.floor((losingPoolCents * creatorFeeBps) / 10_000);
  const distributableCents = winningPoolCents + (losingPoolCents - platformFeeCents - creatorFeeCents);

  return { multiple, distributableCents, platformFeeCents, creatorFeeCents };
}

export type WinnerEntry = { id: string; amount: number };

/**
 * Allocate distributableCents to winner entries by stake share; distribute remainder deterministically.
 */
export function allocatePoolV2PayoutsToEntries(
  winnerEntries: WinnerEntry[],
  distributableCents: number
): Map<string, number> {
  const result = new Map<string, number>();
  if (winnerEntries.length === 0) return result;

  const totalStakeCents = winnerEntries.reduce((s, e) => s + Math.round(Number(e.amount || 0) * 100), 0);
  if (totalStakeCents <= 0) return result;

  type Row = { id: string; stakeCents: number; share: number; provisionalCents: number; remainder: number };
  const rows: Row[] = winnerEntries.map((e) => {
    const stakeCents = Math.round(Number(e.amount || 0) * 100);
    const share = stakeCents / totalStakeCents;
    const exact = distributableCents * share;
    const provisionalCents = Math.floor(exact);
    const remainder = exact - provisionalCents;
    return { id: e.id, stakeCents, share, provisionalCents, remainder };
  });

  let allocated = rows.reduce((s, r) => s + r.provisionalCents, 0);
  let leftover = distributableCents - allocated;

  rows.sort((a, b) => {
    if (b.remainder !== a.remainder) return b.remainder > a.remainder ? 1 : -1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  for (let i = 0; i < rows.length && leftover > 0; i++) {
    const r = rows[i];
    if (!r) continue;
    r.provisionalCents += 1;
    leftover -= 1;
  }

  for (const r of rows) {
    result.set(r.id, r.provisionalCents);
  }
  return result;
}
