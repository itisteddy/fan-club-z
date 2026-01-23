import express from 'express';
import { config } from '../config';
import { supabase, db } from '../config/database';
import { VERSION } from '@fanclubz/shared';
import { emitSettlementComplete, emitWalletUpdate, emitPredictionUpdate } from '../services/realtime';
import { recomputePredictionState } from '../services/predictionMath';
import { computeMerkleSettlement } from '../services/settlementMerkle';
import { makePublicClient } from '../chain/base/client';
import { getEscrowAddress } from '../services/escrowContract';
import { encodePacked, getAddress, keccak256 } from 'viem';
import { calculatePayouts, type Entry as PayoutEntry } from '../services/payoutCalculator';
import { createNotification } from '../services/notifications';
import { upsertSettlementResult, computeSettlementAggregates } from '../services/settlementResults';

const router = express.Router();

// Minimal ABI for settlement root read
const ESCROW_MERKLE_READ_ABI = [
  {
    type: 'function',
    name: 'settlementRoot',
    stateMutability: 'view',
    inputs: [{ name: 'predictionId', type: 'bytes32' }],
    outputs: [{ type: 'bytes32' }],
  },
  {
    type: 'function',
    name: 'claimed',
    stateMutability: 'view',
    inputs: [
      { name: 'predictionId', type: 'bytes32' },
      { name: 'account', type: 'address' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const;

function toBytes32FromUuid(uuid: string): `0x${string}` {
  const hex = uuid.replace(/-/g, '').toLowerCase().padEnd(64, '0');
  return `0x${hex}` as const;
}

// ---- Demo wallet helpers (DB-backed ledger) ----
const DEMO_CURRENCY = 'DEMO_USD';
const DEMO_PROVIDER = 'demo-wallet';

function isAdminRequest(req: any): boolean {
  const adminKey = req.headers['x-admin-key'] || req.headers['authorization'];
  return !!process.env.ADMIN_API_KEY && adminKey === process.env.ADMIN_API_KEY;
}

async function ensureDemoWalletRow(userId: string) {
  await supabase
    .from('wallets')
    .upsert(
      { user_id: userId, currency: DEMO_CURRENCY, available_balance: 0, reserved_balance: 0, updated_at: new Date().toISOString() } as any,
      { onConflict: 'user_id,currency', ignoreDuplicates: true }
    );
}

async function applyDemoDelta(userId: string, args: { availableDelta: number; reservedDelta: number }) {
  await ensureDemoWalletRow(userId);
  // CAS-style update to reduce races: fetch -> compute -> update with equality guards
  const { data: w, error: wErr } = await supabase
    .from('wallets')
    .select('available_balance,reserved_balance')
    .eq('user_id', userId)
    .eq('currency', DEMO_CURRENCY)
    .maybeSingle();
  if (wErr) throw wErr;
  const prevAvail = Number((w as any)?.available_balance || 0);
  const prevRes = Number((w as any)?.reserved_balance || 0);
  const nextAvail = prevAvail + args.availableDelta;
  const nextRes = prevRes + args.reservedDelta;

  const { error: updErr } = await supabase
    .from('wallets')
    .update({ available_balance: nextAvail, reserved_balance: nextRes, updated_at: new Date().toISOString() } as any)
    .eq('user_id', userId)
    .eq('currency', DEMO_CURRENCY)
    .eq('available_balance', prevAvail)
    .eq('reserved_balance', prevRes);
  if (updErr) throw updErr;
}

function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function usdToUnits(n: number): bigint {
  return BigInt(Math.round((Number(n) || 0) * 1_000_000));
}

function hashLeaf(args: { predictionIdHex: `0x${string}`; address: `0x${string}`; amountUnits: bigint }): `0x${string}` {
  return keccak256(
    encodePacked(
      ['bytes32', 'address', 'uint256'],
      [args.predictionIdHex, args.address, args.amountUnits]
    )
  );
}

function buildMerkle(
  leaves: `0x${string}`[]
): { root: `0x${string}`; getProof: (leaf: `0x${string}`) => `0x${string}`[] } {
  const uniqueLeaves = Array.from(new Set(leaves));
  if (uniqueLeaves.length === 0) {
    return { root: keccak256('0x'), getProof: () => [] };
  }

  const tree: `0x${string}`[][] = [];
  tree.push(uniqueLeaves.slice().sort());

  while (true) {
    const prev = tree[tree.length - 1] ?? [];
    if (prev.length <= 1) break;
    const next: `0x${string}`[] = [];
    for (let i = 0; i < prev.length; i += 2) {
      const a = prev[i];
      if (!a) continue;
      if (i + 1 === prev.length) {
        next.push(a);
      } else {
        const b = prev[i + 1] ?? a;
        const [x, y] = a.toLowerCase() < b.toLowerCase() ? [a, b] : [b, a];
        next.push(keccak256(encodePacked(['bytes32', 'bytes32'], [x, y])));
      }
    }
    tree.push(next);
  }

  const rootLevel = tree[tree.length - 1] ?? [];
  const root = (rootLevel[0] ?? keccak256('0x')) as `0x${string}`;

  function getProof(leaf: `0x${string}`): `0x${string}`[] {
    const proof: `0x${string}`[] = [];
    const baseLevel = tree[0] ?? [];
    let idx = baseLevel.indexOf(leaf);
    if (idx === -1) return [];
    for (let level = 0; level < tree.length - 1; level++) {
      const nodes = tree[level] ?? [];
      const isRightNode = idx % 2 === 1;
      const pairIndex = isRightNode ? idx - 1 : idx + 1;
      const pairNode = nodes[pairIndex];
      if (pairNode) proof.push(pairNode);
      idx = Math.floor(idx / 2);
    }
    return proof;
  }

  return { root, getProof };
}

export async function computeMerkleSettlementCryptoOnly(args: { predictionId: string; winningOptionId: string }) {
  const { predictionId, winningOptionId } = args;

  const { data: prediction, error: predictionError } = await supabase
    .from('predictions')
    .select('*')
    .eq('id', predictionId)
    .maybeSingle();
  if (predictionError || !prediction) throw new Error('Prediction not found');

  // CRITICAL: exclude demo entries from on-chain settlement
  const { data: entries, error: entriesError } = await supabase
    .from('prediction_entries')
    .select('*')
    .eq('prediction_id', predictionId)
    .neq('provider', DEMO_PROVIDER);
  if (entriesError) throw new Error('Failed to load entries');

  const winners = (entries || []).filter((e: any) => e.option_id === winningOptionId);
  const losers = (entries || []).filter((e: any) => e.option_id !== winningOptionId);

  const totalWinningStake = winners.reduce((sum, e: any) => sum + Number(e.amount || 0), 0);
  const totalLosingStake = losers.reduce((sum, e: any) => sum + Number(e.amount || 0), 0);

  const platformFeePct = Number.isFinite((prediction as any).platform_fee_percentage)
    ? Number((prediction as any).platform_fee_percentage)
    : 2.5;
  const creatorFeePct = Number.isFinite((prediction as any).creator_fee_percentage)
    ? Number((prediction as any).creator_fee_percentage)
    : 1.0;

  const platformFeeUSD = Math.max(round2((totalLosingStake * platformFeePct) / 100), 0);
  const creatorFeeUSD = Math.max(round2((totalLosingStake * creatorFeePct) / 100), 0);
  const prizePoolUSD = Math.max(totalLosingStake - platformFeeUSD - creatorFeeUSD, 0);
  const payoutPoolUSD = totalWinningStake + prizePoolUSD;
  const payoutPoolUnits = usdToUnits(payoutPoolUSD);
  const predictionIdHex = toBytes32FromUuid(predictionId);

  // Resolve winner addresses
  const userIds = Array.from(new Set(winners.map((w: any) => w.user_id)));
  const { data: addresses } = await supabase
    .from('crypto_addresses')
    .select('user_id,address')
    .in('user_id', userIds)
    .order('created_at', { ascending: false });
  const latestByUser = new Map<string, string>();
  (addresses || []).forEach((r: any) => {
    if (!latestByUser.has(r.user_id)) latestByUser.set(r.user_id, r.address);
  });

  // Aggregate stakes by user to ensure ONE leaf per address
  type Aggregated = { user_id: string; stakeUSD: number; address: `0x${string}` | null };
  const byUser = new Map<string, Aggregated>();
  for (const w of winners as any[]) {
    const prev = byUser.get(w.user_id);
    const inc = Number(w.amount || 0);
    const addressRaw = latestByUser.get(w.user_id) || null;
    const address = addressRaw ? (getAddress(addressRaw) as `0x${string}`) : null;
    if (!prev) {
      byUser.set(w.user_id, { user_id: w.user_id, stakeUSD: inc, address });
    } else {
      prev.stakeUSD += inc;
      prev.address = prev.address || address;
    }
  }

  const stakeCentsByUser = Array.from(byUser.values()).map((u) => ({
    ...u,
    stakeCents: Math.round(u.stakeUSD * 100),
  }));
  const totalWinningStakeCents = stakeCentsByUser.reduce((s, u) => s + u.stakeCents, 0);

  const provisional = stakeCentsByUser.map((u) => {
    const numerator = BigInt(u.stakeCents) * payoutPoolUnits;
    const denom = BigInt(totalWinningStakeCents || 1);
    const units = numerator / denom;
    const remainder = numerator % denom;
    return { ...u, units, remainder };
  });

  const allocated = provisional.reduce((s, u) => s + u.units, 0n);
  let leftover = payoutPoolUnits - allocated;

  provisional.sort((a, b) => {
    if (a.remainder === b.remainder) {
      const ax = (a.address || '0x').toLowerCase();
      const bx = (b.address || '0x').toLowerCase();
      return ax < bx ? -1 : ax > bx ? 1 : 0;
    }
    return a.remainder > b.remainder ? -1 : 1;
  });

  for (let i = 0; i < provisional.length && leftover > 0n; i++) {
    const target = provisional[i];
    if (!target) continue;
    target.units += 1n;
    leftover -= 1n;
  }

  const winnersPayouts = provisional.map((u) => ({
    user_id: u.user_id,
    address: u.address,
    stakeUSD: u.stakeUSD,
    payoutUSD: Number(u.units) / 1_000_000,
    payoutUnits: u.units,
  }));

  const leaves = winnersPayouts
    .filter((w) => !!w.address && w.payoutUnits > 0n)
    .map((w) => hashLeaf({ predictionIdHex, address: w.address as `0x${string}`, amountUnits: w.payoutUnits }));

  const { root, getProof } = buildMerkle(leaves);

  const leafOutputs = winnersPayouts
    .filter((w) => !!w.address && w.payoutUnits > 0n)
    .map((w) => {
      const leaf = hashLeaf({ predictionIdHex, address: w.address as `0x${string}`, amountUnits: w.payoutUnits });
      return {
        user_id: w.user_id,
        address: w.address as `0x${string}`,
        amountUnits: w.payoutUnits,
        leaf,
        proof: getProof(leaf),
      };
    });

  return {
    predictionId,
    winningOptionId,
    platformFeeUSD,
    creatorFeeUSD,
    platformFeeUnits: usdToUnits(platformFeeUSD),
    creatorFeeUnits: usdToUnits(creatorFeeUSD),
    prizePoolUSD,
    payoutPoolUSD,
    winners: winnersPayouts,
    root,
    leaves: leafOutputs,
  };
}

async function upsertDemoTx(payload: any): Promise<boolean> {
  // Idempotency: only apply wallet balance deltas if this tx row is newly created
  const { data, error } = await supabase
    .from('wallet_transactions')
    .upsert(payload, { onConflict: 'provider,external_ref', ignoreDuplicates: true } as any)
    .select('id');
  if (error && (error as any).code !== '23505') {
    console.warn('[SETTLEMENT] demo tx upsert error (non-fatal):', error);
    return false;
  }
  return Array.isArray(data) ? data.length > 0 : Boolean((data as any)?.id);
}

export async function settleDemoRail(args: {
  predictionId: string;
  predictionTitle: string;
  winningOptionId: string;
  creatorId: string;
  platformFeePercent: number;
  creatorFeePercent: number;
}): Promise<{
  demoEntriesCount: number;
  demoPlatformFee: number;
  demoCreatorFee: number;
  demoPayoutPool: number;
}> {
  const { predictionId, winningOptionId, predictionTitle, creatorId } = args;

  const { data: entries, error: entriesErr } = await supabase
    .from('prediction_entries')
    .select('id,user_id,amount,option_id,provider')
    .eq('prediction_id', predictionId)
    .eq('provider', DEMO_PROVIDER);

  if (entriesErr) {
    console.warn('[SETTLEMENT] Failed to load demo entries:', entriesErr);
    return { demoEntriesCount: 0, demoPlatformFee: 0, demoCreatorFee: 0, demoPayoutPool: 0 };
  }

  const demoEntries = (entries || []) as any[];
  if (demoEntries.length === 0) {
    return { demoEntriesCount: 0, demoPlatformFee: 0, demoCreatorFee: 0, demoPayoutPool: 0 };
  }

  // Map entries to payout calculator format
  const payoutEntries: PayoutEntry[] = demoEntries.map((e: any) => ({
    userId: e.user_id,
    optionId: e.option_id,
    amount: Number(e.amount || 0),
    provider: e.provider,
  }));

  // Convert fee percentages to basis points
  const feeConfig = {
    platformFeeBps: args.platformFeePercent * 100, // e.g., 2.5% -> 250 bps
    creatorFeeBps: args.creatorFeePercent * 100, // e.g., 1.0% -> 100 bps
  };

  // Calculate payouts using deterministic calculator
  const demoResult = calculatePayouts({
    entries: payoutEntries,
    winningOptionId,
    feeConfig,
    rail: 'demo',
    providerMatch: (p) => p === DEMO_PROVIDER,
  });

  const winners = demoEntries.filter((e: any) => e.option_id === winningOptionId);
  const losers = demoEntries.filter((e: any) => e.option_id !== winningOptionId);

  // Track total stake per user for reserved balance updates
  const userStakes = new Map<string, number>();
  for (const entry of demoEntries) {
    const current = userStakes.get(entry.user_id) || 0;
    userStakes.set(entry.user_id, current + Number(entry.amount || 0));
  }

  // Apply payouts to winners (aggregated by userId from calculator)
  for (const [userId, payoutAmount] of Object.entries(demoResult.payoutsByUserId)) {
    // Find all entries for this user that won
    const userWinningEntries = winners.filter((e: any) => e.user_id === userId);
    const userTotalStake = userStakes.get(userId) || 0;

    // Update entry statuses
    for (const entry of userWinningEntries) {
      const stake = Number(entry.amount || 0);
      const share = demoResult.winnersStakeTotal > 0 ? stake / demoResult.winnersStakeTotal : 0;
      const entryPayout = round2(demoResult.distributablePot * share);

      await supabase
        .from('prediction_entries')
        .update({ status: 'won', actual_payout: entryPayout, updated_at: new Date().toISOString() } as any)
        .eq('id', entry.id);

      // Record individual entry payout transaction (idempotent)
      const inserted = await upsertDemoTx({
        user_id: userId,
        direction: 'credit',
        type: 'deposit',
        channel: 'fiat',
        provider: DEMO_PROVIDER,
        amount: entryPayout,
        currency: DEMO_CURRENCY,
        status: 'completed',
        external_ref: `demo_payout:${predictionId}:${entry.id}`,
        prediction_id: predictionId,
        entry_id: entry.id,
        description: `Demo payout for "${predictionTitle}"`,
        meta: { kind: 'payout', provider: DEMO_PROVIDER, prediction_id: predictionId, entry_id: entry.id },
      } as any);
      if (inserted) {
        // Only apply delta once per user (not per entry)
        if (userWinningEntries.indexOf(entry) === 0) {
          await applyDemoDelta(userId, { availableDelta: payoutAmount, reservedDelta: -userTotalStake });
          try {
            emitWalletUpdate({ userId, reason: 'payout', amountDelta: payoutAmount });
          } catch {}
        }
      }
    }

    // Phase 6A: Persist canonical settlement result for winner
    try {
      await upsertSettlementResult({
        predictionId,
        userId,
        provider: DEMO_PROVIDER,
        stakeTotal: userTotalStake,
        returnedTotal: payoutAmount,
        net: payoutAmount - userTotalStake,
        status: 'win',
        claimStatus: 'not_applicable',
      });
    } catch (err) {
      console.error('[SETTLEMENT] Failed to persist demo winner result:', err);
      // Non-fatal: continue settlement
    }
  }

  // Record losses (stake already debited at bet placement, so this is just status update)
  // Group losers by user for canonical results
  const loserStakesByUser = new Map<string, number>();
  for (const l of losers) {
    const stake = Number(l.amount || 0);
    const current = loserStakesByUser.get(l.user_id) || 0;
    loserStakesByUser.set(l.user_id, current + stake);

    await supabase
      .from('prediction_entries')
      .update({ status: 'lost', actual_payout: 0, updated_at: new Date().toISOString() } as any)
      .eq('id', l.id);

    // Record loss transaction (idempotent)
    const inserted = await upsertDemoTx({
      user_id: l.user_id,
      direction: 'debit',
      type: 'withdraw',
      channel: 'fiat',
      provider: DEMO_PROVIDER,
      amount: stake,
      currency: DEMO_CURRENCY,
      status: 'completed',
      external_ref: `demo_loss:${predictionId}:${l.id}`,
      prediction_id: predictionId,
      entry_id: l.id,
      description: `Demo loss for "${predictionTitle}"`,
      meta: { kind: 'loss', provider: DEMO_PROVIDER, prediction_id: predictionId, entry_id: l.id },
    } as any);
    if (inserted) {
      await applyDemoDelta(l.user_id, { availableDelta: 0, reservedDelta: -stake });
      try {
        emitWalletUpdate({ userId: l.user_id, reason: 'loss', amountDelta: -stake });
      } catch {}
    }
  }

  // Phase 6A: Persist canonical settlement results for losers
  for (const [userId, totalStake] of loserStakesByUser.entries()) {
    try {
      await upsertSettlementResult({
        predictionId,
        userId,
        provider: DEMO_PROVIDER,
        stakeTotal: totalStake,
        returnedTotal: 0,
        net: -totalStake,
        status: 'loss',
        claimStatus: 'not_applicable',
      });
    } catch (err) {
      console.error('[SETTLEMENT] Failed to persist loser result:', err);
      // Non-fatal: continue settlement
    }
  }

  // Demo creator/platform fees (ALWAYS computed and credited if pot > 0, idempotent)
  // This fixes the bug where fees were skipped in hybrid mode
  if (demoResult.totalPot > 0 && (demoResult.platformFee > 0 || demoResult.creatorFee > 0)) {
    if (demoResult.creatorFee > 0) {
      const inserted = await upsertDemoTx({
        user_id: creatorId,
        direction: 'credit',
        type: 'deposit',
        channel: 'fiat',
        provider: DEMO_PROVIDER,
        amount: demoResult.creatorFee,
        currency: DEMO_CURRENCY,
        status: 'completed',
        external_ref: `demo_creator_fee:${predictionId}`,
        prediction_id: predictionId,
        description: `Demo creator fee for "${predictionTitle}"`,
        meta: { kind: 'creator_fee', provider: DEMO_PROVIDER, prediction_id: predictionId },
      } as any);
      if (inserted) {
        await applyDemoDelta(creatorId, { availableDelta: demoResult.creatorFee, reservedDelta: 0 });
        try {
          emitWalletUpdate({ userId: creatorId, reason: 'creator_fee_paid', amountDelta: demoResult.creatorFee });
        } catch {}
      }
    }

    if (demoResult.platformFee > 0) {
      const treasuryUserId = await resolveTreasuryUserId();
      if (treasuryUserId) {
        const inserted = await upsertDemoTx({
          user_id: treasuryUserId,
          direction: 'credit',
          type: 'deposit',
          channel: 'fiat',
          provider: DEMO_PROVIDER,
          amount: demoResult.platformFee,
          currency: DEMO_CURRENCY,
          status: 'completed',
          external_ref: `demo_platform_fee:${predictionId}`,
          prediction_id: predictionId,
          description: `Demo platform fee for "${predictionTitle}"`,
          meta: { kind: 'platform_fee', provider: DEMO_PROVIDER, prediction_id: predictionId },
        } as any);
        if (inserted) {
          await applyDemoDelta(treasuryUserId, { availableDelta: demoResult.platformFee, reservedDelta: 0 });
          try {
            emitWalletUpdate({ userId: treasuryUserId, reason: 'platform_fee_collected', amountDelta: demoResult.platformFee });
          } catch {}
        }
      }
    }
  }

  return {
    demoEntriesCount: demoEntries.length,
    demoPlatformFee: demoResult.platformFee,
    demoCreatorFee: demoResult.creatorFee,
    demoPayoutPool: demoResult.distributablePot,
  };
}

// ============================================================
// FIAT RAIL SETTLEMENT - Phase 7B
// ============================================================
const FIAT_PROVIDER = 'fiat-paystack';
const FIAT_CURRENCY = 'NGN';

/**
 * Settle fiat (NGN) entries - similar to demo but for Paystack deposits
 * Handles winner payouts, loser debits, and fee distribution
 */
export async function settleFiatRail(args: {
  predictionId: string;
  predictionTitle: string;
  winningOptionId: string;
  creatorId: string;
  platformFeePercent: number;
  creatorFeePercent: number;
}): Promise<{
  fiatEntriesCount: number;
  fiatPlatformFee: number;
  fiatCreatorFee: number;
  fiatPayoutPool: number;
}> {
  const { predictionId, winningOptionId, predictionTitle, creatorId } = args;

  const { data: entries, error: entriesErr } = await supabase
    .from('prediction_entries')
    .select('id,user_id,amount,option_id,provider')
    .eq('prediction_id', predictionId)
    .eq('provider', FIAT_PROVIDER);

  if (entriesErr) {
    console.warn('[SETTLEMENT] Failed to load fiat entries:', entriesErr);
    return { fiatEntriesCount: 0, fiatPlatformFee: 0, fiatCreatorFee: 0, fiatPayoutPool: 0 };
  }

  const fiatEntries = (entries || []) as any[];
  if (fiatEntries.length === 0) {
    return { fiatEntriesCount: 0, fiatPlatformFee: 0, fiatCreatorFee: 0, fiatPayoutPool: 0 };
  }

  // Map entries to payout calculator format (amounts stored in NGN, we work in kobo internally)
  const payoutEntries: PayoutEntry[] = fiatEntries.map((e: any) => ({
    userId: e.user_id,
    optionId: e.option_id,
    amount: Number(e.amount || 0) * 100, // Convert NGN to kobo for calculation
    provider: e.provider,
  }));

  const feeConfig = {
    platformFeeBps: args.platformFeePercent * 100,
    creatorFeeBps: args.creatorFeePercent * 100,
  };

  // Calculate payouts
  const fiatResult = calculatePayouts({
    entries: payoutEntries,
    winningOptionId,
    feeConfig,
    rail: 'fiat',
    providerMatch: (p) => p === FIAT_PROVIDER,
  });

  const winners = fiatEntries.filter((e: any) => e.option_id === winningOptionId);
  const losers = fiatEntries.filter((e: any) => e.option_id !== winningOptionId);

  // Track stakes per user
  const userStakes = new Map<string, number>();
  for (const entry of fiatEntries) {
    const stake = Number(entry.amount || 0) * 100; // kobo
    userStakes.set(entry.user_id, (userStakes.get(entry.user_id) || 0) + stake);
  }

  // Helper to insert fiat transaction (idempotent)
  async function upsertFiatTx(payload: any): Promise<boolean> {
    const { error } = await supabase.from('wallet_transactions').insert(payload);
    if (error && (error as any).code === '23505') return false; // Already exists
    if (error) {
      console.warn('[SETTLEMENT] fiat tx insert error:', error);
      return false;
    }
    return true;
  }

  // Apply payouts to winners
  for (const [userId, payoutAmountKobo] of Object.entries(fiatResult.payoutsByUserId)) {
    const userWinningEntries = winners.filter((e: any) => e.user_id === userId);
    const userTotalStakeKobo = userStakes.get(userId) || 0;

    for (const entry of userWinningEntries) {
      const stakeNgn = Number(entry.amount || 0);
      const stakeKobo = stakeNgn * 100;
      const share = fiatResult.winnersStakeTotal > 0 ? stakeKobo / fiatResult.winnersStakeTotal : 0;
      const entryPayoutKobo = Math.round(fiatResult.distributablePot * share);

      await supabase
        .from('prediction_entries')
        .update({ status: 'won', actual_payout: entryPayoutKobo / 100, updated_at: new Date().toISOString() } as any)
        .eq('id', entry.id);

      // Record payout transaction
      const inserted = await upsertFiatTx({
        user_id: userId,
        direction: 'credit',
        type: 'stake_payout',
        channel: 'fiat',
        provider: FIAT_PROVIDER,
        amount: entryPayoutKobo,
        currency: FIAT_CURRENCY,
        status: 'confirmed',
        external_ref: `fiat_payout:${predictionId}:${entry.id}`,
        prediction_id: predictionId,
        entry_id: entry.id,
        description: `Fiat payout for "${predictionTitle}"`,
        meta: { kind: 'stake_payout', provider: FIAT_PROVIDER, prediction_id: predictionId, entry_id: entry.id, amountNgn: entryPayoutKobo / 100 },
      });
      if (inserted) {
        try {
          emitWalletUpdate({ userId, reason: 'payout', amountDelta: entryPayoutKobo / 100 });
        } catch {}
      }
    }

    // Persist canonical settlement result for winner
    try {
      await upsertSettlementResult({
        predictionId,
        userId,
        provider: FIAT_PROVIDER,
        stakeTotal: userTotalStakeKobo / 100, // Store in NGN
        returnedTotal: (payoutAmountKobo as number) / 100,
        net: ((payoutAmountKobo as number) - userTotalStakeKobo) / 100,
        status: 'win',
        claimStatus: 'not_applicable',
      });
    } catch (err) {
      console.error('[SETTLEMENT] Failed to persist fiat winner result:', err);
    }
  }

  // Record losses
  const loserStakesByUser = new Map<string, number>();
  for (const l of losers) {
    const stakeKobo = Number(l.amount || 0) * 100;
    const current = loserStakesByUser.get(l.user_id) || 0;
    loserStakesByUser.set(l.user_id, current + stakeKobo);

    await supabase
      .from('prediction_entries')
      .update({ status: 'lost', actual_payout: 0, updated_at: new Date().toISOString() } as any)
      .eq('id', l.id);
  }

  // Persist canonical settlement results for losers
  for (const [userId, totalStakeKobo] of loserStakesByUser.entries()) {
    try {
      await upsertSettlementResult({
        predictionId,
        userId,
        provider: FIAT_PROVIDER,
        stakeTotal: totalStakeKobo / 100,
        returnedTotal: 0,
        net: -totalStakeKobo / 100,
        status: 'loss',
        claimStatus: 'not_applicable',
      });
    } catch (err) {
      console.error('[SETTLEMENT] Failed to persist fiat loser result:', err);
    }
  }

  // Fiat creator/platform fees
  if (fiatResult.totalPot > 0 && (fiatResult.platformFee > 0 || fiatResult.creatorFee > 0)) {
    if (fiatResult.creatorFee > 0) {
      await upsertFiatTx({
        user_id: creatorId,
        direction: 'credit',
        type: 'creator_fee',
        channel: 'fiat',
        provider: FIAT_PROVIDER,
        amount: fiatResult.creatorFee,
        currency: FIAT_CURRENCY,
        status: 'confirmed',
        external_ref: `fiat_creator_fee:${predictionId}`,
        prediction_id: predictionId,
        description: `Fiat creator fee for "${predictionTitle}"`,
        meta: { kind: 'creator_fee', provider: FIAT_PROVIDER, prediction_id: predictionId, amountNgn: fiatResult.creatorFee / 100 },
      });
    }

    // Platform fee goes to treasury (or platform account)
    const treasuryUserId = process.env.PLATFORM_TREASURY_USER_ID || process.env.TREASURY_USER_ID;
    if (fiatResult.platformFee > 0 && treasuryUserId) {
      await upsertFiatTx({
        user_id: treasuryUserId,
        direction: 'credit',
        type: 'platform_fee',
        channel: 'fiat',
        provider: FIAT_PROVIDER,
        amount: fiatResult.platformFee,
        currency: FIAT_CURRENCY,
        status: 'confirmed',
        external_ref: `fiat_platform_fee:${predictionId}`,
        prediction_id: predictionId,
        description: `Fiat platform fee for "${predictionTitle}"`,
        meta: { kind: 'platform_fee', provider: FIAT_PROVIDER, prediction_id: predictionId, amountNgn: fiatResult.platformFee / 100 },
      });
    }
  }

  console.log('[SETTLEMENT] Fiat rail settled:', {
    predictionId,
    entries: fiatEntries.length,
    winners: winners.length,
    losers: losers.length,
    platformFee: fiatResult.platformFee / 100,
    creatorFee: fiatResult.creatorFee / 100,
    payoutPool: fiatResult.distributablePot / 100,
  });

  return {
    fiatEntriesCount: fiatEntries.length,
    fiatPlatformFee: fiatResult.platformFee / 100, // Return in NGN
    fiatCreatorFee: fiatResult.creatorFee / 100,
    fiatPayoutPool: fiatResult.distributablePot / 100,
  };
}

async function ensureOnchainPosted(predictionId: string): Promise<`0x${string}` | null> {
  try {
    const client = makePublicClient();
    const escrow = await getEscrowAddress();
    const idBytes = toBytes32FromUuid(predictionId);
    const root = (await client.readContract({
      address: escrow,
      abi: ESCROW_MERKLE_READ_ABI,
      functionName: 'settlementRoot',
      args: [idBytes],
    })) as `0x${string}`;
    if (root && /^0x0{64}$/i.test(root) === false) {
      // Phase 4A: Mark DB as finalized if not already (explicit state machine)
      const { data: existing } = await supabase
        .from('bet_settlements')
        .select('meta')
        .eq('bet_id', predictionId)
        .maybeSingle();
      const existingMeta = (existing?.meta as any) || {};
      const existingStateMachine = existingMeta.stateMachine || {};
      
      await supabase.from('bet_settlements').update({ 
        status: 'onchain_finalized', 
        meta: {
          ...existingMeta,
          merkle_root: root,
          stateMachine: {
            ...existingStateMachine,
            onchain_finalized: true,
          }
        } 
      } as any).eq('bet_id', predictionId);
      return root;
    }
    return null;
  } catch (e) {
    console.warn('[SETTLEMENT] ensureOnchainPosted check failed', e);
    return null;
  }
}

async function isClaimedOnchain(predictionId: string, account: string): Promise<boolean> {
  try {
    const client = makePublicClient();
    const escrow = await getEscrowAddress();
    const idBytes = toBytes32FromUuid(predictionId);
    const claimed = (await client.readContract({
      address: escrow,
      abi: ESCROW_MERKLE_READ_ABI,
      functionName: 'claimed',
      args: [idBytes, getAddress(account)],
    })) as boolean;
    return Boolean(claimed);
  } catch (e) {
    console.warn('[SETTLEMENT] claimed() read failed', e);
    // Fail-open (treat as not claimed) to avoid blocking legitimate claims if RPC is flaky
    return false;
  }
}

export async function resolveTreasuryUserId(): Promise<string | null> {
  const raw = config.platform?.treasuryUserId;
  if (!raw) return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;

  // If caller provided a wallet address, resolve to the owning user
  if (trimmed.startsWith('0x')) {
    const { data, error } = await supabase
      .from('crypto_addresses')
      .select('user_id')
      .eq('address', trimmed.toLowerCase())
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (error) {
      console.warn('[SETTLEMENT] Unable to resolve treasury wallet address:', error);
      return null;
    }

    if (!data?.user_id) {
      console.warn('[SETTLEMENT] No user found for treasury wallet address:', trimmed);
      return null;
    }

    return data.user_id;
  }

  const { data: userRow, error: userLookupError } = await supabase
    .from('users')
    .select('id')
    .eq('id', trimmed)
    .maybeSingle();

  if (userLookupError) {
    console.warn('[SETTLEMENT] Failed to verify treasury user id:', userLookupError);
  }

  if (!userRow?.id) {
    console.warn('[SETTLEMENT] Treasury user id not found in users table:', trimmed);
    return null;
  }

  return trimmed;
}

export async function recordOnchainPosted(args: { predictionId: string; txHash: string; root?: string | null }) {
  const { predictionId, txHash, root } = args;

  // Phase 4A: Update to onchain_finalized state (explicit state machine)
  // Also preserve existing meta and update stateMachine flags
  const { data: existing } = await supabase
    .from('bet_settlements')
    .select('meta')
    .eq('bet_id', predictionId)
    .maybeSingle();

  const existingMeta = (existing?.meta as any) || {};
  const existingStateMachine = existingMeta.stateMachine || {};

  await supabase
    .from('bet_settlements')
    .update({
      status: 'onchain_finalized',  // Phase 4A: Use explicit state machine status
      meta: {
        ...existingMeta,
        tx_hash: txHash,
        merkle_root: root || null,
        updated_at: new Date().toISOString(),
        stateMachine: {
          ...existingStateMachine,
          onchain_finalized: true,
        }
      }
    } as any)
    .eq('bet_id', predictionId);

  // Create on-chain fee activity rows for creator and platform (if available)
  try {
    const { data: pred } = await supabase
      .from('predictions')
      .select('id,title,creator_id,winning_option_id,platform_fee_percentage,creator_fee_percentage')
      .eq('id', predictionId)
      .maybeSingle();
    if (pred?.winning_option_id) {
      // Ensure demo rail (if any) is settled off-chain as well (idempotent via external_ref)
      await settleDemoRail({
        predictionId,
        predictionTitle: pred.title,
        winningOptionId: pred.winning_option_id,
        creatorId: pred.creator_id,
        platformFeePercent: Number.isFinite((pred as any).platform_fee_percentage) ? Number((pred as any).platform_fee_percentage) : 2.5,
        creatorFeePercent: Number.isFinite((pred as any).creator_fee_percentage) ? Number((pred as any).creator_fee_percentage) : 1.0,
      });

      const settlement = await computeMerkleSettlementCryptoOnly({ predictionId, winningOptionId: pred.winning_option_id });
      const currency = 'USD';
      // Creator fee
      if (settlement.creatorFeeUSD > 0 && pred.creator_id) {
        await supabase.from('wallet_transactions').insert({
          user_id: pred.creator_id,
          direction: 'credit',
          type: 'deposit',
          channel: 'creator_fee',
          provider: 'onchain-escrow',
          amount: settlement.creatorFeeUSD,
          currency,
          status: 'completed',
          prediction_id: predictionId,
          description: `Creator fee (on-chain) for "${pred.title}"`,
          tx_hash: txHash,
          meta: { merkle_root: settlement.root }
        } as any);
      }
      // Platform fee
      if (settlement.platformFeeUSD > 0) {
        const treasuryUserId = await resolveTreasuryUserId();
        if (treasuryUserId) {
          await supabase.from('wallet_transactions').insert({
            user_id: treasuryUserId,
            direction: 'credit',
            type: 'deposit',
            channel: 'platform_fee',
            provider: 'onchain-escrow',
            amount: settlement.platformFeeUSD,
            currency,
            status: 'completed',
            prediction_id: predictionId,
            description: `Platform fee (on-chain) for "${pred.title}"`,
            tx_hash: txHash,
            meta: { merkle_root: settlement.root }
          } as any);
        }
      }
    }
  } catch (postErr) {
    console.warn('[SETTLEMENT] Failed to record on-chain fee activity:', postErr);
  }
}

// POST /api/v2/settlement/manual - Manual settlement by creator
router.post('/manual', async (req, res) => {
  try {
    const { predictionId, winningOptionId, proofUrl, reason } = req.body;
    const userId = req.body.userId; // In production, this would come from JWT auth
    
    console.log('');
    console.log('🔨🔨🔨 [SETTLEMENT] ========================================');
    console.log('🔨 [SETTLEMENT] Manual settlement endpoint called');
    console.log('🔨 [SETTLEMENT] Request body:', JSON.stringify(req.body, null, 2));
    console.log('🔨 [SETTLEMENT] Prediction ID:', predictionId);
    console.log('🔨 [SETTLEMENT] Winning Option ID:', winningOptionId);
    console.log('🔨 [SETTLEMENT] User ID:', userId);
    console.log('🔨🔨🔨 [SETTLEMENT] ========================================');
    console.log('');
    
    // Validate required fields
    if (!predictionId || !winningOptionId || !userId) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'predictionId, winningOptionId, and userId are required',
        version: VERSION
      });
    }

    // Get prediction details and verify creator
    const { data: prediction, error: predictionError } = await supabase
      .from('predictions')
      .select('*')
      .eq('id', predictionId)
      .single();

    if (predictionError || !prediction) {
      console.error('Prediction not found:', predictionError);
      return res.status(404).json({
        error: 'Not found',
        message: 'Prediction not found',
        version: VERSION
      });
    }

    // Verify user is creator (in production, add proper auth check)
    if (prediction.creator_id !== userId) {
      return res.status(403).json({
        error: 'Unauthorized',
        message: 'Only the prediction creator can settle manually',
        version: VERSION
      });
    }

    // Verify winning option belongs to this prediction
    const { data: winningOption, error: optionError } = await supabase
      .from('prediction_options')
      .select('*')
      .eq('id', winningOptionId)
      .eq('prediction_id', predictionId)
      .single();

    if (optionError || !winningOption) {
      return res.status(400).json({
        error: 'Invalid option',
        message: 'Winning option not found for this prediction',
        version: VERSION
      });
    }

    // Phase 4A: Check if settlement already exists (idempotency check)
    const { data: existingSettlement } = await supabase
      .from('bet_settlements')
      .select('status, winning_option_id, meta')
      .eq('bet_id', predictionId)
      .maybeSingle();

    // If settlement already exists with same winning option, return success (idempotent)
    if (existingSettlement && existingSettlement.winning_option_id === winningOptionId) {
      const currentStatus = existingSettlement.status;
      // If already offchain_settled or beyond, return success without re-processing
      if (['offchain_settled', 'demo_paid', 'onchain_finalized', 'completed', 'onchain_posted'].includes(currentStatus)) {
        console.log(`[SETTLEMENT] Settlement already exists for ${predictionId} with status ${currentStatus}, returning success (idempotent)`);
        return res.json({
          success: true,
          data: {
            settlement: existingSettlement,
            message: 'Settlement already completed (idempotent)',
            alreadySettled: true
          },
          version: VERSION
        });
      }
    }

    // If settlement exists with different winning option, reject (safety check)
    if (existingSettlement && existingSettlement.winning_option_id !== winningOptionId) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Settlement already exists with a different winning option',
        version: VERSION
      });
    }

    // Get all prediction entries for this prediction
    const { data: allEntries, error: entriesError } = await supabase
      .from('prediction_entries')
      .select('*')
      .eq('prediction_id', predictionId);

    if (entriesError) {
      console.error('Error fetching entries:', entriesError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch prediction entries',
        version: VERSION
      });
    }

    // Split entries by provider for per-rail settlement
    const demoEntries = (allEntries || []).filter((e: any) => e?.provider === DEMO_PROVIDER);
    const fiatEntries = (allEntries || []).filter((e: any) => e?.provider === FIAT_PROVIDER);
    const cryptoEntries = (allEntries || []).filter((e: any) => 
      e?.provider !== DEMO_PROVIDER && e?.provider !== FIAT_PROVIDER
    );
    const hasDemoRail = demoEntries.length > 0;
    const hasFiatRail = fiatEntries.length > 0;
    const hasCryptoRail = cryptoEntries.length > 0;

    const platformFeePercent = Number.isFinite(prediction.platform_fee_percentage) ? Number(prediction.platform_fee_percentage) : 2.5;
    const creatorFeePercent = Number.isFinite(prediction.creator_fee_percentage) ? Number(prediction.creator_fee_percentage) : 1.0;
    
    // Phase 3A: Settle demo rail first (off-chain, idempotent)
    // IMPORTANT: Always call settleDemoRail if demo entries exist, even in hybrid mode
    // This ensures demo fees are always computed and credited with idempotent external_ref keys
    let demoSummary = { demoEntriesCount: 0, demoPlatformFee: 0, demoCreatorFee: 0, demoPayoutPool: 0 };
    if (hasDemoRail) {
      demoSummary = await settleDemoRail({
        predictionId,
        predictionTitle: prediction.title,
        winningOptionId,
        creatorId: prediction.creator_id,
        platformFeePercent,
        creatorFeePercent,
      });
      
      // Log demo settlement application (using payout calculator results)
      const demoWinnersCount = demoEntries.filter((e: any) => e.option_id === winningOptionId).length;
      console.log('[settlement] demo applied', {
        predictionId,
        demoPot: demoSummary.demoPayoutPool + demoSummary.demoPlatformFee + demoSummary.demoCreatorFee,
        platformFee: demoSummary.demoPlatformFee,
        creatorFee: demoSummary.demoCreatorFee,
        winners: demoWinnersCount,
      });
    }

    // Phase 7B: Settle fiat rail (NGN via Paystack, off-chain, idempotent)
    let fiatSummary = { fiatEntriesCount: 0, fiatPlatformFee: 0, fiatCreatorFee: 0, fiatPayoutPool: 0 };
    if (hasFiatRail) {
      fiatSummary = await settleFiatRail({
        predictionId,
        predictionTitle: prediction.title,
        winningOptionId,
        creatorId: prediction.creator_id,
        platformFeePercent,
        creatorFeePercent,
      });
      
      const fiatWinnersCount = fiatEntries.filter((e: any) => e.option_id === winningOptionId).length;
      console.log('[settlement] fiat applied', {
        predictionId,
        fiatPot: fiatSummary.fiatPayoutPool + fiatSummary.fiatPlatformFee + fiatSummary.fiatCreatorFee,
        platformFee: fiatSummary.fiatPlatformFee,
        creatorFee: fiatSummary.fiatCreatorFee,
        winners: fiatWinnersCount,
      });
    }

    // Calculate crypto rail settlement amounts (if any)
    const cryptoWinners = cryptoEntries.filter((e: any) => e.option_id === winningOptionId);
    const cryptoLosers = cryptoEntries.filter((e: any) => e.option_id !== winningOptionId);
    const totalCryptoWinningStake = cryptoWinners.reduce((sum, entry) => sum + (entry.amount || 0), 0);
    const totalCryptoLosingStake = cryptoLosers.reduce((sum, entry) => sum + (entry.amount || 0), 0);

    // Fees are charged on LOSING stakes only (per rail)
    const rawCryptoPlatformFee = (totalCryptoLosingStake * platformFeePercent) / 100;
    const rawCryptoCreatorFee = (totalCryptoLosingStake * creatorFeePercent) / 100;

    const cryptoPlatformFee = Math.max(Math.round(rawCryptoPlatformFee * 100) / 100, 0);
    const cryptoCreatorFee = Math.max(Math.round(rawCryptoCreatorFee * 100) / 100, 0);
    
    // Crypto payout pool = winners get their stakes back + share of (losing stakes - fees)
    const cryptoPrizePool = Math.max(totalCryptoLosingStake - cryptoPlatformFee - cryptoCreatorFee, 0);
    const cryptoPayoutPool = totalCryptoWinningStake + cryptoPrizePool;

    // Combined totals for response (demo + crypto)
    const totalPlatformFee = demoSummary.demoPlatformFee + cryptoPlatformFee;
    const totalCreatorFee = demoSummary.demoCreatorFee + cryptoCreatorFee;
    const totalPayoutPool = demoSummary.demoPayoutPool + cryptoPayoutPool;

    console.log('💰 Settlement calculation:', {
      demo: demoSummary,
      crypto: {
        totalWinningStake: totalCryptoWinningStake,
        totalLosingStake: totalCryptoLosingStake,
        platformFee: cryptoPlatformFee,
        creatorFee: cryptoCreatorFee,
        payoutPool: cryptoPayoutPool,
      },
      combined: {
        platformFee: totalPlatformFee,
        creatorFee: totalCreatorFee,
        payoutPool: totalPayoutPool,
      },
      totalEntries: allEntries?.length || 0
    });

    // If no participants, return fees to creator (no payouts)
    if (!allEntries || allEntries.length === 0) {
      console.log('📭 No participants - settling with creator fee only');
      
      // Update prediction status to settled
      const { error: updatePredictionError } = await supabase
        .from('predictions')
        .update({ 
          status: 'settled', 
          settled_at: new Date().toISOString(),
          winning_option_id: winningOptionId
        })
        .eq('id', predictionId);

      if (updatePredictionError) {
        console.error('Error updating prediction status:', updatePredictionError);
      }

      // Create settlement record
      const { data: settlement, error: settlementError } = await supabase
        .from('bet_settlements')
        .insert({
          bet_id: predictionId,
          winning_option_id: winningOptionId,
          total_payout: 0,
          platform_fee_collected: 0,
          creator_payout_amount: 0,
          settlement_time: new Date().toISOString()
        })
        .select()
        .single();

      return res.json({
        success: true,
        data: {
          settlement,
          totalPayout: 0,
          platformFee: 0,
          creatorFee: 0,
          winnersCount: 0,
          participantsCount: 0
        },
        message: 'Prediction settled successfully (no participants)',
        version: VERSION
      });
    }

    // Process crypto winners/losers (demo already handled by settleDemoRail)
    const winnersCount = cryptoWinners.length + (demoSummary.demoEntriesCount > 0 ? demoEntries.filter((e: any) => e.option_id === winningOptionId).length : 0);

    // Map escrow locks to the outcome of the associated entry so we can avoid refunding losers
    const lockOutcomeById = new Map<
      string,
      { result: 'won' | 'lost'; entryId: string; userId: string }
    >();

    if (allEntries) {
      for (const entry of allEntries) {
        if (entry.escrow_lock_id) {
          lockOutcomeById.set(entry.escrow_lock_id, {
            result: entry.option_id === winningOptionId ? 'won' : 'lost',
            entryId: entry.id,
            userId: entry.user_id,
          });
        }
      }
    }

    console.log('🏆 Winners calculation:', {
      winnersCount,
      cryptoWinners: cryptoWinners.length,
      demoWinners: demoSummary.demoEntriesCount > 0 ? demoEntries.filter((e: any) => e.option_id === winningOptionId).length : 0,
      cryptoPayoutPool,
      demoPayoutPool: demoSummary.demoPayoutPool
    });

    // Begin transaction for settlement
    const settlementResults = [];

    // Process crypto winners only (demo winners already handled by settleDemoRail)
    console.log('');
    console.log(`🏆🏆🏆 [SETTLEMENT] ========================================`);
    console.log(`🏆 [SETTLEMENT] Processing crypto winners`);
    console.log(`🏆 [SETTLEMENT] Crypto winners: ${cryptoWinners.length}`);
    console.log(`🏆 [SETTLEMENT] Demo winners already processed: ${demoSummary.demoEntriesCount > 0 ? demoEntries.filter((e: any) => e.option_id === winningOptionId).length : 0}`);
    console.log(`🏆🏆🏆 [SETTLEMENT] ========================================`);
    console.log('');

    // Phase 6A: Track crypto user stakes and payouts for canonical results (by provider)
    const cryptoUserStakes = new Map<string, Map<string, number>>(); // userId -> provider -> stake
    const cryptoUserPayouts = new Map<string, Map<string, number>>(); // userId -> provider -> payout
    for (const entry of cryptoEntries) {
      const provider = entry.provider || 'crypto-base-usdc'; // Fallback to default
      if (!cryptoUserStakes.has(entry.user_id)) {
        cryptoUserStakes.set(entry.user_id, new Map());
        cryptoUserPayouts.set(entry.user_id, new Map());
      }
      const userStakes = cryptoUserStakes.get(entry.user_id)!;
      const current = userStakes.get(provider) || 0;
      userStakes.set(provider, current + Number(entry.amount || 0));
    }
    
    for (const winner of cryptoWinners) {
      console.log('');
      console.log(`🔄 [SETTLEMENT] Processing winner ${winner.id}...`);
      console.log('');
      
      const winnerStake = winner.amount || 0;
      const winnerShare = totalCryptoWinningStake > 0 ? winnerStake / totalCryptoWinningStake : 0;
      const payout = Math.floor(cryptoPayoutPool * winnerShare * 100) / 100; // Round to 2 decimals
      
      console.log(`📊 [SETTLEMENT] Winner calculation: stake=$${winnerStake}, share=${winnerShare}, payout=$${payout}`);
      
      // Update the entry with actual payout
      console.log(`📝 [SETTLEMENT] Updating entry ${winner.id} to 'won' status...`);
      const { error: updateEntryError } = await supabase
        .from('prediction_entries')
        .update({
          status: 'won',
          actual_payout: payout,
          updated_at: new Date().toISOString()
        })
        .eq('id', winner.id);

      if (updateEntryError) {
        console.error('❌ [SETTLEMENT] Error updating winner entry:', updateEntryError);
        console.error('❌ [SETTLEMENT] Skipping wallet update for this winner');
        continue; // Skip wallet update if entry update failed
      }
      
      console.log(`✅ [SETTLEMENT] Entry updated successfully`);

      // Credit crypto winner's wallet with payout (demo winners already handled by settleDemoRail)
      try {

        console.log('');
        console.log(`💰💰💰 [SETTLEMENT] ========================================`);
        console.log(`💰 [SETTLEMENT] Processing winner payout`);
        console.log(`💰 [SETTLEMENT] Winner user ID: ${winner.user_id}`);
        console.log(`💰 [SETTLEMENT] Winner entry ID: ${winner.id}`);
        console.log(`💰 [SETTLEMENT] Payout amount: $${payout}`);
        console.log(`💰 [SETTLEMENT] Prediction ID: ${predictionId}`);
        console.log(`💰💰💰 [SETTLEMENT] ========================================`);
        console.log('');
        
        // Update wallet balance
        console.log(`💰 [SETTLEMENT] Step 1: Calling db.wallets.directUpdateBalance...`);
        const balanceResult = await db.wallets.directUpdateBalance(winner.user_id, 'USD', payout, 0);
        console.log(`💰 [SETTLEMENT] Step 1 COMPLETE - Balance update result:`, JSON.stringify(balanceResult, null, 2));
        
        // Create wallet transaction record
        console.log(`💰 [SETTLEMENT] Step 2: Creating wallet transaction record...`);
        const txData = {
          user_id: winner.user_id,
          direction: 'credit' as const,
          type: 'deposit' as const,
          channel: 'payout' as const,
          provider: 'crypto-base-usdc',
          amount: payout,
          currency: 'USD' as const,
          status: 'completed' as const,
          // Idempotency: prevent duplicate win payouts if settlement is retried
          external_ref: `settlement:${predictionId}:payout:${winner.id}`,
          prediction_id: predictionId,
          entry_id: winner.id,
          description: `Prediction win payout for "${prediction.title}"`,
          meta: {
            prediction_id: predictionId,
            prediction_entry_id: winner.id,
            original_stake: winnerStake,
            winning_option_id: winningOptionId,
            prediction_title: prediction.title
          }
        };
        console.log(`💰 [SETTLEMENT] Step 2a: Transaction data prepared:`, JSON.stringify(txData, null, 2));
        
        console.log(`💰 [SETTLEMENT] Step 2b: Calling db.transactions.create()...`);
        const txResult = await db.transactions.create(txData);
        console.log(`💰 [SETTLEMENT] Step 2 COMPLETE - Transaction created:`, JSON.stringify(txResult, null, 2));
        
        console.log('');
        console.log(`✅✅✅ [SETTLEMENT] Successfully credited ${payout} USD to winner ${winner.user_id}`);
        console.log('');
        
        // Phase 6A: Track user payout for canonical results (by provider)
        const provider = winner.provider || 'crypto-base-usdc';
        if (!cryptoUserPayouts.has(winner.user_id)) {
          cryptoUserPayouts.set(winner.user_id, new Map());
        }
        const userPayouts = cryptoUserPayouts.get(winner.user_id)!;
        const currentPayout = userPayouts.get(provider) || 0;
        userPayouts.set(provider, currentPayout + payout);
        
        settlementResults.push({
          userId: winner.user_id,
          entryId: winner.id,
          stake: winnerStake,
          payout: payout
        });
      } catch (walletError) {
        console.error('');
        console.error(`❌❌❌ [SETTLEMENT] ========================================`);
        console.error(`❌ [SETTLEMENT] FATAL ERROR updating wallet for winner ${winner.user_id}`);
        console.error(`❌ [SETTLEMENT] Error:`, walletError);
        console.error(`❌ [SETTLEMENT] Error message:`, (walletError as Error).message);
        console.error(`❌ [SETTLEMENT] Error stack:`, (walletError as Error).stack);
        console.error(`❌❌❌ [SETTLEMENT] ========================================`);
        console.error('');
        // Continue with other winners even if one fails
      }
    }

    // Phase 6A: Persist canonical results for crypto winners (per provider)
    for (const [userId, userPayouts] of cryptoUserPayouts.entries()) {
      const userStakes = cryptoUserStakes.get(userId) || new Map();
      for (const [provider, totalPayout] of userPayouts.entries()) {
        const totalStake = userStakes.get(provider) || 0;
        try {
          await upsertSettlementResult({
            predictionId,
            userId,
            provider,
            stakeTotal: totalStake,
            returnedTotal: totalPayout,
            net: totalPayout - totalStake,
            status: 'win',
            claimStatus: 'not_applicable', // Crypto is credited directly, not claimable
          });
        } catch (err) {
          console.error('[SETTLEMENT] Failed to persist crypto winner result:', err);
          // Non-fatal: continue settlement
        }
      }
    }

    // Update crypto losing entries (demo losers already handled by settleDemoRail)
    const cryptoLoserStakesByUser = new Map<string, Map<string, number>>(); // userId -> provider -> stake
    for (const loser of cryptoLosers) {
      const stake = Number(loser.amount || 0);
      const provider = loser.provider || 'crypto-base-usdc';
      if (!cryptoLoserStakesByUser.has(loser.user_id)) {
        cryptoLoserStakesByUser.set(loser.user_id, new Map());
      }
      const userStakes = cryptoLoserStakesByUser.get(loser.user_id)!;
      const current = userStakes.get(provider) || 0;
      userStakes.set(provider, current + stake);

      const { error: updateLoserError } = await supabase
        .from('prediction_entries')
        .update({
          status: 'lost',
          actual_payout: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', loser.id);

      if (updateLoserError) {
        console.error('Error updating loser entry:', updateLoserError);
      }

      // Record crypto loss activity (demo losses already handled by settleDemoRail)
      try {
        const lossAmount = Number(loser.amount || 0);
        await supabase
          .from('wallet_transactions')
          .insert({
            user_id: loser.user_id,
            direction: 'debit',
            type: 'withdraw',
            channel: 'settlement_loss',
            provider: 'crypto-base-usdc',
            amount: lossAmount,
            currency: 'USD',
            status: 'completed',
            // Idempotency: prevent duplicate loss rows if settlement is retried
            external_ref: `settlement:${predictionId}:loss:${loser.id}`,
            prediction_id: predictionId,
            entry_id: loser.id,
            description: `Loss recorded for "${prediction.title}"`,
            meta: {
              reason: 'loss',
              prediction_id: predictionId,
              prediction_entry_id: loser.id,
              prediction_title: prediction.title,
              winning_option_id: winningOptionId
            }
          } as any)
          .then(({ error }) => {
            if (error && (error as any).code !== '23505') {
              console.warn('[SETTLEMENT] loss tx insert error (non-fatal):', error);
            }
          });
      } catch (lossTxErr) {
        console.warn('[SETTLEMENT] Failed to record loss transaction:', lossTxErr);
      }
    }

    // Phase 6A: Persist canonical results for crypto losers (per provider)
    for (const [userId, userStakes] of cryptoLoserStakesByUser.entries()) {
      for (const [provider, totalStake] of userStakes.entries()) {
        try {
          await upsertSettlementResult({
            predictionId,
            userId,
            provider,
            stakeTotal: totalStake,
            returnedTotal: 0,
            net: -totalStake,
            status: 'loss',
            claimStatus: 'not_applicable',
          });
        } catch (err) {
          console.error('[SETTLEMENT] Failed to persist crypto loser result:', err);
          // Non-fatal: continue settlement
        }
      }
    }

    // Credit creator and platform fees (demo fees already handled by settleDemoRail, only process crypto fees here)
    const feeCurrency = config.platform?.feeCurrency || 'USD';
    let treasuryUserId: string | null = null;
    if (cryptoPlatformFee > 0) {
      treasuryUserId = await resolveTreasuryUserId();
    }
    if (cryptoCreatorFee > 0) {
      try {
        console.log('');
        console.log(`🎨🎨🎨 [SETTLEMENT] ========================================`);
        console.log(`🎨 [SETTLEMENT] Processing creator fee (crypto rail)`);
        console.log(`🎨 [SETTLEMENT] Creator ID: ${prediction.creator_id}`);
        console.log(`🎨 [SETTLEMENT] Fee amount: $${cryptoCreatorFee}`);
        console.log(`🎨🎨🎨 [SETTLEMENT] ========================================`);
        console.log('');
        
        console.log(`🎨 [SETTLEMENT] Step 1: Updating creator wallet balance (crypto fee)...`);
        await db.wallets.directUpdateBalance(prediction.creator_id, feeCurrency, cryptoCreatorFee, 0);
        console.log(`🎨 [SETTLEMENT] Step 1 COMPLETE`);
        
        console.log(`🎨 [SETTLEMENT] Step 2: Creating creator fee transaction...`);
        const creatorTxResult = await db.transactions.create({
          user_id: prediction.creator_id,
          direction: 'credit',
          type: 'deposit',
          channel: 'creator_fee',
          provider: 'crypto-base-usdc',
          amount: cryptoCreatorFee,
          currency: feeCurrency,
          status: 'completed',
          external_ref: `settlement:${predictionId}:creator_fee:crypto`,
          description: `Creator fee (crypto rail) for "${prediction.title}"`,
          meta: {
            prediction_id: predictionId,
            winning_option_id: winningOptionId,
            reason: 'creator_fee',
            settlement_type: 'manual',
            rail: 'crypto',
            prediction_title: prediction.title
          }
        });
        console.log(`🎨 [SETTLEMENT] Step 2 COMPLETE - Transaction:`, JSON.stringify(creatorTxResult, null, 2));
        console.log('');
        console.log(`✅ [SETTLEMENT] Creator fee (crypto) credited successfully`);
        console.log('');
        
        try {
          emitWalletUpdate({ userId: prediction.creator_id, reason: 'creator_fee_paid', amountDelta: cryptoCreatorFee });
        } catch (emitErr) {
          console.warn('⚠️ Failed to emit creator wallet update:', emitErr);
        }
      } catch (creatorWalletError) {
        console.error('');
        console.error(`❌❌❌ [SETTLEMENT] FATAL ERROR crediting creator fee`);
        console.error(`❌ [SETTLEMENT] Error:`, creatorWalletError);
        console.error(`❌ [SETTLEMENT] Error message:`, (creatorWalletError as Error).message);
        console.error('');
      }
    }

    if (cryptoPlatformFee > 0) {
      if (treasuryUserId) {
        try {
          console.log('');
          console.log(`🏦🏦🏦 [SETTLEMENT] ========================================`);
          console.log(`🏦 [SETTLEMENT] Processing platform fee (crypto rail)`);
          console.log(`🏦 [SETTLEMENT] Treasury user ID: ${treasuryUserId}`);
          console.log(`🏦 [SETTLEMENT] Fee amount: $${cryptoPlatformFee}`);
          console.log(`🏦🏦🏦 [SETTLEMENT] ========================================`);
          console.log('');
          
          console.log(`🏦 [SETTLEMENT] Step 1: Updating treasury wallet balance...`);
          await db.wallets.directUpdateBalance(treasuryUserId, feeCurrency, cryptoPlatformFee, 0);
          console.log(`🏦 [SETTLEMENT] Step 1 COMPLETE`);
          
          console.log(`🏦 [SETTLEMENT] Step 2: Creating platform fee transaction...`);
          const platformTxResult = await db.transactions.create({
            user_id: treasuryUserId,
            direction: 'credit',
            type: 'deposit',
            channel: 'platform_fee',
            provider: 'crypto-base-usdc',
            amount: cryptoPlatformFee,
            currency: feeCurrency,
            status: 'completed',
            external_ref: `settlement:${predictionId}:platform_fee:crypto`,
            description: `Platform fee (crypto rail) collected for "${prediction.title}"`,
            meta: {
              prediction_id: predictionId,
              winning_option_id: winningOptionId,
              reason: 'platform_fee',
              settlement_type: 'manual',
              rail: 'crypto',
              prediction_title: prediction.title
            }
          });
          console.log(`🏦 [SETTLEMENT] Step 2 COMPLETE - Transaction:`, JSON.stringify(platformTxResult, null, 2));
          console.log('');
          console.log(`✅ [SETTLEMENT] Platform fee (crypto) credited successfully`);
          console.log('');
          
          try {
            emitWalletUpdate({ userId: treasuryUserId, reason: 'platform_fee_collected', amountDelta: cryptoPlatformFee });
          } catch (emitErr) {
            console.warn('⚠️ Failed to emit platform wallet update:', emitErr);
          }
        } catch (platformWalletError) {
          console.error('');
          console.error(`❌❌❌ [SETTLEMENT] FATAL ERROR crediting platform fee`);
          console.error(`❌ [SETTLEMENT] Error:`, platformWalletError);
          console.error(`❌ [SETTLEMENT] Error message:`, (platformWalletError as Error).message);
          console.error('');
        }
      } else {
        console.warn('');
        console.warn('⚠️⚠️⚠️ [SETTLEMENT] ========================================');
        console.warn('⚠️ [SETTLEMENT] PLATFORM_TREASURY_USER_ID is not configured or could not be resolved');
        console.warn('⚠️ [SETTLEMENT] Platform fee (crypto) of $' + cryptoPlatformFee + ' was NOT credited to any wallet');
        console.warn('⚠️⚠️⚠️ [SETTLEMENT] ========================================');
        console.warn('');
      }
    }

    // Phase 4A: Create/update settlement record with explicit state machine
    // State: offchain_settled (outcome decided, payouts computed)
    // Next states: demo_paid (if demo rail) or onchain_finalized (if crypto rail)
    const settlementStatus = hasDemoRail && !hasCryptoRail 
      ? 'demo_paid'  // Demo-only: payouts already applied by settleDemoRail
      : 'offchain_settled';  // Hybrid or crypto-only: outcome decided, crypto finalize pending

    const { data: settlement, error: settlementError } = await supabase
      .from('bet_settlements')
      .upsert({
        bet_id: predictionId,
        winning_option_id: winningOptionId,
        total_payout: totalPayoutPool,
        platform_fee_collected: totalPlatformFee,
        creator_payout_amount: totalCreatorFee,
        settlement_time: new Date().toISOString(),
        status: settlementStatus,
        meta: {
          demo: demoSummary,
          crypto: {
            platformFee: cryptoPlatformFee,
            creatorFee: cryptoCreatorFee,
            payoutPool: cryptoPayoutPool,
            needsFinalize: hasCryptoRail,
          },
          stateMachine: {
            offchain_settled: true,
            demo_paid: hasDemoRail && !hasCryptoRail,
            onchain_finalized: false, // Will be updated by finalize step
          }
        }
      } as any, { onConflict: 'bet_id' } as any)
      .select()
      .single();

    if (settlementError) {
      console.error('Error creating settlement record:', settlementError);
    }

    // Release all escrow locks for this prediction
    // This unlocks funds that were locked for bets on this prediction
    const { data: releasedLocks, error: releaseLocksError } = await supabase
      .from('escrow_locks')
      .update({
        status: 'released',
        state: 'released',
        released_at: new Date().toISOString()
      })
      .eq('prediction_id', predictionId)
      .in('status', ['locked', 'consumed'])
      .select('id, user_id, amount');

    if (releaseLocksError) {
      console.error('Error releasing escrow locks:', releaseLocksError);
    } else if (releasedLocks && releasedLocks.length > 0) {
      const totalReleased = releasedLocks.reduce((sum, lock) => sum + Number(lock.amount || 0), 0);
      console.log(`🔓 Released ${releasedLocks.length} escrow locks (total: $${totalReleased.toFixed(2)}) for prediction ${predictionId}`);
      
      const refundableLocks = releasedLocks.filter((lock) => {
        const outcome = lockOutcomeById.get(lock.id);
        if (!outcome) {
          // Lock never produced an entry (e.g. abandoned) – refund user
          return true;
        }
        if (outcome.result === 'won') {
          // Winners already received full payout (stake + profit)
          console.log(`[Settlement] Skipping unlock credit for winning lock ${lock.id}`);
          return false;
        }
        if (outcome.result === 'lost') {
          // Losing stakes remain in the pool and have already been distributed
          console.log(`[Settlement] Skipping unlock credit for losing lock ${lock.id}`);
          return false;
        }
        return false;
      });

      for (const lock of refundableLocks) {
        await supabase
          .from('wallet_transactions')
          .insert({
            user_id: lock.user_id,
            direction: 'credit',
            type: 'credit',
            channel: 'escrow_unlock',
            provider: 'base/usdc',
            amount: Number(lock.amount || 0),
            currency: 'USD',
            status: 'success',
            external_ref: `settlement_${predictionId}_${lock.id}`,
            description: `Funds unlocked after prediction settlement`,
            meta: {
              prediction_id: predictionId,
              lock_id: lock.id,
              settlement_type: 'manual'
            }
          });
      }
    }

    // Update prediction status to settled
    const { error: updatePredictionError } = await supabase
      .from('predictions')
      .update({ 
        status: 'settled', 
        settled_at: new Date().toISOString(),
        winning_option_id: winningOptionId
      })
      .eq('id', predictionId);

    if (updatePredictionError) {
      console.error('Error updating prediction status:', updatePredictionError);
    }

    // Record creator payout if there's a crypto fee (demo fees already recorded by settleDemoRail)
    if (cryptoCreatorFee > 0) {
      const { error: payoutError } = await supabase
        .from('creator_payouts')
        .insert({
          creator_id: prediction.creator_id,
          bet_id: predictionId,
          amount: cryptoCreatorFee,
          currency: feeCurrency,
          status: 'processed',
          processed_at: new Date().toISOString()
        });

      if (payoutError) {
        console.error('Error recording creator payout:', payoutError);
      }
    }

    const recomputed = await recomputePredictionState(predictionId);

    console.log('✅ Settlement completed successfully');
    emitSettlementComplete({ predictionId, winnersCount });
    emitPredictionUpdate({ predictionId });
    try {
      for (const r of settlementResults) {
        if (r.userId) emitWalletUpdate({ userId: r.userId, reason: 'settlement_payout', amountDelta: r.payout });
      }
    } catch (emitError) {
      console.warn('⚠️ Failed to emit settlement payout updates:', emitError);
    }

    // Phase 4C: Create in-app notifications for participants
    console.log('🔔 Creating notifications for participants...');
    for (const entry of allEntries) {
      try {
        const isWinner = entry.option_id === winningOptionId;
        const payout = isWinner ? Number(entry.actual_payout || 0) : 0;
        const isDemo = entry.provider === DEMO_PROVIDER;
        const isCrypto = !isDemo;
        
        // A) Win/Loss notification
        const winLossType = isWinner ? 'win' : 'loss';
        const winLossTitle = isWinner ? 'You won!' : 'Result settled';
        const winLossBody = isWinner
          ? `You won $${payout.toFixed(2)} on "${prediction.title}"`
          : `The prediction "${prediction.title}" has been settled.`;
        
        await createNotification({
          userId: entry.user_id,
          type: winLossType,
          title: winLossTitle,
          body: winLossBody,
          href: `/predictions/${predictionId}`,
          metadata: {
            predictionId,
            predictionTitle: prediction.title,
            winningOptionId,
            entryId: entry.id,
            payout: isWinner ? payout : 0,
          },
          externalRef: `notif:${winLossType}:${predictionId}:${entry.user_id}`,
        }).catch((err) => {
          console.warn(`[Notifications] Failed to create ${winLossType} notification for ${entry.user_id}:`, err);
        });
        
        // B) Demo payout credited notification (for demo winners)
        if (isWinner && isDemo && payout > 0) {
          await createNotification({
            userId: entry.user_id,
            type: 'payout',
            title: 'Payout credited',
            body: `Your demo wallet was credited $${payout.toFixed(2)} for "${prediction.title}".`,
            href: `/wallet`,
            metadata: {
              predictionId,
              predictionTitle: prediction.title,
              entryId: entry.id,
              payout,
              rail: 'demo',
            },
            externalRef: `notif:payout_demo:${predictionId}:${entry.user_id}`,
          }).catch((err) => {
            console.warn(`[Notifications] Failed to create demo payout notification for ${entry.user_id}:`, err);
          });
        }
        
        // C) Crypto claim available notification (for crypto winners - only if claimable)
        // Note: Claim availability is determined by onchain finalization status
        // For now, we'll create the notification; it can be filtered client-side if needed
        if (isWinner && isCrypto && payout > 0) {
          // Check if settlement is finalized (claimable) by querying the actual settlement status
          const { data: currentSettlement } = await supabase
            .from('bet_settlements')
            .select('status')
            .eq('bet_id', predictionId)
            .maybeSingle();
          
          const isFinalized = currentSettlement?.status === 'onchain_finalized' || currentSettlement?.status === 'onchain_posted';
          if (isFinalized) {
            await createNotification({
              userId: entry.user_id,
              type: 'claim',
              title: 'Claim available',
              body: `Your payout of $${payout.toFixed(2)} is ready to claim for "${prediction.title}".`,
              href: `/predictions/${predictionId}`,
              metadata: {
                predictionId,
                predictionTitle: prediction.title,
                entryId: entry.id,
                payout,
                rail: 'crypto',
              },
              externalRef: `notif:claim:${predictionId}:${entry.user_id}`,
            }).catch((err) => {
              console.warn(`[Notifications] Failed to create claim notification for ${entry.user_id}:`, err);
            });
          }
        }
        
      } catch (notificationError) {
        console.error(`❌ Failed to notify participant ${entry.user_id}:`, notificationError);
        // Continue with other notifications even if one fails
      }
    }
    console.log('✅ Participant notifications created');

    // Phase 6A: Compute canonical aggregates
    let aggregates: any = {};
    try {
      aggregates = await computeSettlementAggregates(predictionId, allEntries || []);
      // Override with actual fee values from settlement
      if (aggregates.demo) {
        aggregates.demo.platformFee = demoSummary.demoPlatformFee;
        aggregates.demo.creatorFee = demoSummary.demoCreatorFee;
      }
      if (aggregates.crypto) {
        aggregates.crypto.platformFee = cryptoPlatformFee;
        aggregates.crypto.creatorFee = cryptoCreatorFee;
      }
    } catch (err) {
      console.error('[SETTLEMENT] Failed to compute aggregates:', err);
      // Non-fatal: continue without aggregates
    }

    return res.json({
      success: true,
      data: {
        settlement,
        totalPayout: totalPayoutPool,
        platformFee: totalPlatformFee,
        creatorFee: totalCreatorFee,
        demo: demoSummary,
        crypto: {
          platformFee: cryptoPlatformFee,
          creatorFee: cryptoCreatorFee,
          payoutPool: cryptoPayoutPool,
        },
        aggregates, // Phase 6A: Canonical aggregates
        winnersCount,
        participantsCount: allEntries.length,
        results: settlementResults,
        prediction: recomputed.prediction,
        updatedOptions: recomputed.options
      },
      message: 'Prediction settled successfully',
      version: VERSION
    });

  } catch (error) {
    console.error('Error in manual settlement:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to settle prediction',
      version: VERSION,
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DEBUG/OPS: Inspect computed leaves for a prediction (only after on-chain post)
router.get('/:predictionId/leaves', async (req, res) => {
  try {
    const { predictionId } = req.params as { predictionId: string };
    const { address } = req.query as { address?: string };
    if (!predictionId) {
      return res.status(400).json({ error: 'bad_request', message: 'predictionId required', version: VERSION });
    }
    // Ensure settlement was posted on-chain
    const { data: s } = await supabase
      .from('bet_settlements')
      .select('winning_option_id,status,meta')
      .eq('bet_id', predictionId)
      .maybeSingle();
    // Phase 4A: Accept both old and new statuses for backward compatibility
    const isFinalized = s?.status === 'onchain_finalized' || s?.status === 'onchain_posted';
    if (!s || !isFinalized || !s.winning_option_id) {
      return res.status(409).json({ error: 'not_ready', message: 'Settlement not finalized on-chain', version: VERSION });
    }
    const settlement = await computeMerkleSettlementCryptoOnly({ predictionId, winningOptionId: s.winning_option_id });
    const leaves = settlement.leaves.map((l) => ({
      address: l.address,
      amountUnits: l.amountUnits.toString(),
      amountUSD: Number(l.amountUnits) / 1_000_000,
      proofLen: (l.proof || []).length,
    }));
    const filtered = address ? leaves.filter((l) => l.address.toLowerCase() === String(address).toLowerCase()) : leaves;
    return res.json({ success: true, data: { root: settlement.root, leaves: filtered }, version: VERSION });
  } catch (e: any) {
    console.error('[SETTLEMENT] leaves debug error', e);
    return res.status(500).json({ error: 'internal', message: e?.message || 'failed', version: VERSION });
  }
});

// GET /api/v2/settlement/:predictionId/merkle-proof?address=0x...
// Returns the leaf/proof and claim amount for a given wallet address
router.get('/:predictionId/merkle-proof', async (req, res) => {
  try {
    const { predictionId } = req.params as { predictionId: string };
    const { address } = req.query as { address?: string };

    if (!predictionId || !address) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'predictionId and address are required',
        version: VERSION
      });
    }

    // Determine winning option used for this prediction (from bet_settlements or predictions)
    let winningOptionId: string | null = null;
    const { data: settlementRow } = await supabase
      .from('bet_settlements')
      .select('winning_option_id,status,meta')
      .eq('bet_id', predictionId)
      .maybeSingle();
    if (settlementRow?.winning_option_id) {
      winningOptionId = settlementRow.winning_option_id;
    } else {
      const { data: pred } = await supabase
        .from('predictions')
        .select('winning_option_id')
        .eq('id', predictionId)
        .maybeSingle();
      winningOptionId = pred?.winning_option_id ?? null;
    }

    // Phase 4C: Gate by on-chain finalized status (explicit state machine)
    // Accept both old and new statuses for backward compatibility
    const isFinalized = settlementRow?.status === 'onchain_finalized' || settlementRow?.status === 'onchain_posted';
    if (!isFinalized) {
      const onchain = await ensureOnchainPosted(predictionId);
      if (!onchain) {
        return res.status(409).json({
          error: 'not_ready',
          message: 'Settlement not finalized on-chain yet',
          version: VERSION
        });
      }
    }

    if (!winningOptionId) {
      return res.status(409).json({
        error: 'not_ready',
        message: 'Settlement not prepared for this prediction yet',
        version: VERSION
      });
    }

    // Phase 4C: Compute merkle settlement (crypto-only entries)
    // Merkle tree only includes crypto entries, so if address not found, they either:
    // 1. Only have demo entries (already paid instantly, no claim needed)
    // 2. Lost or didn't participate with crypto
    const settlement = await computeMerkleSettlementCryptoOnly({ predictionId, winningOptionId });
    const normalized = String(address).toLowerCase();
    const leaf = settlement.leaves.find((l) => l.address.toLowerCase() === normalized);

    if (!leaf) {
      // Phase 4C: Provide helpful message if user might have demo entries
      // Check if address has any entries (demo or crypto) to provide better error
      const { data: walletAddr } = await supabase
        .from('wallet_addresses')
        .select('user_id')
        .eq('address', normalized)
        .eq('chain_id', 84532)
        .maybeSingle();
      
      if (walletAddr?.user_id) {
        const { data: userEntries } = await supabase
          .from('prediction_entries')
          .select('provider')
          .eq('prediction_id', predictionId)
          .eq('user_id', walletAddr.user_id)
          .limit(1);
        
        const hasDemoEntry = userEntries?.some((e: any) => e.provider === DEMO_PROVIDER);
        if (hasDemoEntry) {
          return res.status(404).json({
            error: 'not_found',
            message: 'Demo entries are paid instantly. No on-chain claim needed.',
            version: VERSION
          });
        }
      }
      
      return res.status(404).json({
        error: 'not_found',
        message: 'Address is not eligible or no claimable amount',
        version: VERSION
      });
    }

  const amountUnits = leaf.amountUnits ?? 0n;
  const amountUSD = Number(amountUnits) / 1_000_000;

  // Exclude already-claimed on-chain
  const alreadyClaimed = await isClaimedOnchain(predictionId, normalized);
  if (alreadyClaimed) {
    return res.status(409).json({
      error: 'already_claimed',
      message: 'This address has already claimed',
      version: VERSION
    });
  }

  return res.json({
    success: true,
    data: {
      predictionId,
      merkleRoot: settlement.root,
      amountUnits: amountUnits.toString(),
      amountUSD,
      proof: leaf.proof ?? [],
    },
    version: VERSION
  });
  } catch (error: any) {
    console.error('Error generating merkle proof:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error?.message || 'Failed to generate proof',
      version: VERSION
    });
  }
});

// GET /api/v2/settlement/claimable?address=0x...&limit=20
// Returns claimable settlements for a given wallet address
// Optimized to avoid slow on-chain calls where possible
router.get('/claimable', async (req, res) => {
  const startTime = Date.now();
  try {
    const { address, limit: limitStr } = req.query as { address?: string; limit?: string };
    if (!address) {
      return res.status(400).json({ error: 'bad_request', message: 'address is required', version: VERSION });
    }
    const normalized = String(address).toLowerCase();
    const limit = Math.min(parseInt(limitStr || '20', 10) || 20, 100);

    console.log(`[SETTLEMENT] Fetching claimable for ${normalized.slice(0, 10)}...`);

    // Phase 4A: Include both on-chain finalized settlements AND off-chain settlements
    // Off-chain settlements can be converted to on-chain claims if Merkle root is posted
    // First, fetch on-chain finalized settlements (ready to claim)
    // Accept both old ('onchain_posted') and new ('onchain_finalized') statuses for backward compatibility
    const { data: onchainSettled, error: onchainError } = await supabase
      .from('bet_settlements')
      .select('bet_id, winning_option_id, status, meta')
      .in('status', ['onchain_finalized', 'onchain_posted'])  // Phase 4A: Support both old and new statuses
      .order('created_at', { ascending: false })
      .limit(limit * 2);
    
    // Also fetch off-chain settled/completed settlements (may need Merkle root posted)
    // Phase 4A: Include new state machine statuses
    const { data: offchainSettled, error: offchainError } = await supabase
      .from('bet_settlements')
      .select('bet_id, winning_option_id, status, meta')
      .in('status', ['offchain_settled', 'demo_paid', 'completed', 'computed'])  // Phase 4A: Include new statuses
      .order('created_at', { ascending: false })
      .limit(limit * 2);
    
    // Also check for settled predictions without bet_settlements entry (old off-chain settlements)
    const { data: settledPredsWithoutEntry } = await supabase
      .from('predictions')
      .select('id, winning_option_id, settled_at')
      .eq('status', 'settled')
      .not('winning_option_id', 'is', null)
      .order('settled_at', { ascending: false })
      .limit(limit);
    
    // Combine all settlements, deduplicated by bet_id
    const settledMap = new Map<string, { bet_id: string; winning_option_id: string | null; status: string; meta?: any }>();
    
    if (onchainSettled) {
      for (const s of onchainSettled) {
        settledMap.set(s.bet_id, s);
      }
    }
    if (offchainSettled) {
      // For off-chain, check if Merkle root can be posted/claimed
      for (const s of offchainSettled) {
        // Check if root already exists on-chain (might have been posted retroactively)
        const existingRoot = await ensureOnchainPosted(s.bet_id);
        if (existingRoot) {
          // Root exists on-chain, treat as onchain_finalized (Phase 4A: use new status)
          settledMap.set(s.bet_id, { ...s, status: 'onchain_finalized', meta: { ...s.meta, merkle_root: existingRoot } });
        } else {
          // Root not posted yet - do NOT include for claimable list
          // Winners are already credited off-chain; on-chain claim would revert.
        }
      }
    }
    if (settledPredsWithoutEntry) {
      // Add predictions without bet_settlements entry
      for (const p of settledPredsWithoutEntry) {
        const existingRoot = await ensureOnchainPosted(p.id);
        if (existingRoot) {
          settledMap.set(p.id, {
            bet_id: p.id,
            winning_option_id: p.winning_option_id,
            status: 'onchain_finalized',  // Phase 4A: use new status
            meta: { merkle_root: existingRoot }
          });
        }
      }
    }
    
    const settledPreds = Array.from(settledMap.values());
    
    const settledError = onchainError || offchainError;

    if (settledError) {
      console.error('[SETTLEMENT] claimable query failed:', settledError);
      // Check if table doesn't exist
      if (settledError.message?.includes('does not exist') || settledError.code === '42P01') {
        console.warn('[SETTLEMENT] bet_settlements table does not exist - returning empty claims');
        return res.json({ success: true, data: { claims: [] }, message: 'No settlements available', version: VERSION });
      }
      return res.status(500).json({ error: 'internal', message: 'Failed to query settlements', details: settledError.message, version: VERSION });
    }

    if (!settledPreds || settledPreds.length === 0) {
      console.log(`[SETTLEMENT] No settlements found (${Date.now() - startTime}ms)`);
      return res.json({ success: true, data: { claims: [] }, version: VERSION });
    }

    // Fetch prediction details for all settled predictions
    const predictionIds = [...new Set(settledPreds.map(s => s.bet_id))]; // Deduplicate
    const { data: preds, error: predsError } = await supabase
      .from('predictions')
      .select('id, title, settled_at, winning_option_id')
      .in('id', predictionIds);

    if (predsError) {
      console.error('[SETTLEMENT] claimable predictions query failed:', predsError);
      return res.status(500).json({ error: 'internal', message: 'Failed to query predictions', version: VERSION });
    }

    const predMap = new Map((preds || []).map(p => [p.id, p]));
    const results: Array<{
      predictionId: string;
      title: string;
      amountUnits: string;
      amountUSD: number;
      proof: `0x${string}`[];
      merkleRoot: `0x${string}`;
    }> = [];

    // Process each settled prediction
    for (const s of settledPreds) {
      if (results.length >= limit) break;
      
      let p = predMap.get(s.bet_id);
      if (!p) {
        // If prediction not in predMap, fetch it
        const { data: singlePred } = await supabase
          .from('predictions')
          .select('id, title, settled_at, winning_option_id')
          .eq('id', s.bet_id)
          .maybeSingle();
        if (!singlePred) continue;
        predMap.set(s.bet_id, singlePred);
        p = singlePred;
      }
      
      if (!p) continue;

      try {
        const winningOptionId = (s.winning_option_id ?? p.winning_option_id) as string | null;
        if (!winningOptionId) continue;

        // Compute merkle settlement (uses cached data, no on-chain calls)
        const settlement = await computeMerkleSettlementCryptoOnly({ predictionId: p.id, winningOptionId });
        const leaf = settlement.leaves.find((l) => l.address.toLowerCase() === normalized);
        if (!leaf || (leaf.amountUnits ?? 0n) === 0n) continue;

        // For off-chain settlements, check if root can be posted/claimed
        // If status is not onchain_posted, try to ensure root is posted
        if (s.status !== 'onchain_posted') {
          const root = await ensureOnchainPosted(p.id);
          if (!root) {
            // Root not posted yet - skip for now (user already credited off-chain)
            // TODO: Could show a "Post root to claim on-chain" option
            continue;
          }
          // Root exists, treat as onchain_posted
        }

        // Check if already claimed on-chain (with timeout protection)
        let alreadyClaimed = false;
        try {
          const claimCheckPromise = isClaimedOnchain(p.id, normalized);
          const timeoutPromise = new Promise<boolean>((_, reject) => 
            setTimeout(() => reject(new Error('Claim check timeout')), 5000)
          );
          alreadyClaimed = await Promise.race([claimCheckPromise, timeoutPromise]);
        } catch (claimErr) {
          // If claim check fails/times out, assume not claimed (fail-open)
          console.warn(`[SETTLEMENT] Claim check failed for ${p.id}, assuming not claimed:`, claimErr);
          alreadyClaimed = false;
        }

        if (alreadyClaimed) continue;

        // Get Merkle root (from meta or compute)
        const merkleRoot = (s.meta?.merkle_root as `0x${string}`) || settlement.root;

        results.push({
          predictionId: p.id,
          title: p.title,
          amountUnits: (leaf.amountUnits ?? 0n).toString(),
          amountUSD: Number(leaf.amountUnits ?? 0n) / 1_000_000,
          proof: (leaf.proof ?? []) as `0x${string}`[],
          merkleRoot,
        });
      } catch (err) {
        // Skip errors per prediction but log them
        console.warn(`[SETTLEMENT] Error processing claimable for ${p.id}:`, err);
        continue;
      }
    }

    console.log(`[SETTLEMENT] Found ${results.length} claimable for ${normalized.slice(0, 10)}... (${Date.now() - startTime}ms)`, {
      totalSettled: settledPreds.length,
      uniquePredictions: predictionIds.length,
      claimablePredictions: results.map(r => ({ id: r.predictionId, title: r.title, amount: r.amountUSD }))
    });
    return res.json({ success: true, data: { claims: results }, version: VERSION });
  } catch (e) {
    console.error('[SETTLEMENT] claimable error', e);
    return res.status(500).json({ error: 'internal', message: 'Failed to compute claimable', version: VERSION });
  }
});
// POST /api/v2/settlement/manual/merkle - Creator-led Merkle settlement (on-chain flow)
router.post('/manual/merkle', async (req, res) => {
  try {
    const { predictionId, winningOptionId, userId, reason } = req.body as {
      predictionId: string;
      winningOptionId: string;
      userId: string;
      reason?: string;
    };

    if (!predictionId || !winningOptionId || !userId) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'predictionId, winningOptionId, and userId are required',
        version: VERSION
      });
    }

    // Verify user is creator
    const { data: prediction, error: predictionError } = await supabase
      .from('predictions')
      .select('id, creator_id, title, status, platform_fee_percentage, creator_fee_percentage')
      .eq('id', predictionId)
      .single();
    if (predictionError || !prediction) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Prediction not found',
        version: VERSION
      });
    }
    if (prediction.creator_id !== userId) {
      return res.status(403).json({
        error: 'Unauthorized',
        message: 'Only the prediction creator can initiate on-chain settlement',
        version: VERSION
      });
    }

    // Load entries once to decide if we have any crypto rail participants
    const { data: allEntries, error: entriesErr } = await supabase
      .from('prediction_entries')
      .select('id,user_id,amount,option_id,provider')
      .eq('prediction_id', predictionId);

    if (entriesErr) {
      console.error('[SETTLEMENT] Failed to load entries:', entriesErr);
      return res.status(500).json({ error: 'database_error', message: 'Failed to load entries', version: VERSION });
    }

    const demoSummary = await settleDemoRail({
      predictionId,
      predictionTitle: prediction.title,
      winningOptionId,
      creatorId: prediction.creator_id,
      platformFeePercent: Number.isFinite((prediction as any).platform_fee_percentage) ? Number((prediction as any).platform_fee_percentage) : 2.5,
      creatorFeePercent: Number.isFinite((prediction as any).creator_fee_percentage) ? Number((prediction as any).creator_fee_percentage) : 1.0,
    });

    const cryptoEntries = (allEntries || []).filter((e: any) => e?.provider !== DEMO_PROVIDER);
    const hasCryptoRail = cryptoEntries.length > 0;

    // Demo-only prediction: settle off-chain and do NOT require on-chain root
    if (!hasCryptoRail) {
      await supabase
        .from('bet_settlements')
        .upsert(
          {
            bet_id: predictionId,
            winning_option_id: winningOptionId,
            total_payout: demoSummary.demoPayoutPool,
            platform_fee_collected: demoSummary.demoPlatformFee,
            creator_payout_amount: demoSummary.demoCreatorFee,
            settlement_time: new Date().toISOString(),
            status: 'completed',
            meta: { rail: 'demo' },
          } as any,
          { onConflict: 'bet_id' } as any
        );

      try {
        await supabase
          .from('predictions')
          .update({
            status: 'settled',
            settled_at: new Date().toISOString(),
            winning_option_id: winningOptionId,
            updated_at: new Date().toISOString(),
          } as any)
          .eq('id', predictionId);
      } catch {}

      emitSettlementComplete({ predictionId });
      emitPredictionUpdate({ predictionId });

      return res.json({
        success: true,
        data: {
          predictionId,
          title: prediction.title,
          winningOptionId,
          demo: demoSummary,
          summary: {
            platformFeeUSD: demoSummary.demoPlatformFee,
            creatorFeeUSD: demoSummary.demoCreatorFee,
            payoutPoolUSD: demoSummary.demoPayoutPool,
            winnersCount: 0,
          },
        },
        message: 'Demo settlement completed off-chain (no on-chain action required).',
        version: VERSION,
      });
    }

    // Compute distribution and Merkle structure (CRYPTO rail only; winners claim later)
    const settlement = await computeMerkleSettlementCryptoOnly({ predictionId, winningOptionId });

    // Record a pending settlement record (for audit; on-chain confirmation happens via watcher)
    await supabase
      .from('bet_settlements')
      .upsert(
        {
          bet_id: predictionId,
          winning_option_id: winningOptionId,
          total_payout: settlement.payoutPoolUSD,
          platform_fee_collected: settlement.platformFeeUSD,
          creator_payout_amount: settlement.creatorFeeUSD,
          settlement_time: new Date().toISOString(),
          status: 'pending_onchain',
          meta: {
            reason: reason || null,
            merkle_root: settlement.root,
            winners: settlement.winners.length
          }
        },
        { onConflict: 'bet_id' }
      );

    // 1) Update prediction as settled immediately (so UI shows results prior to claim)
    try {
      await supabase
        .from('predictions')
        .update({
          status: 'settled',
          settled_at: new Date().toISOString(),
          winning_option_id: winningOptionId,
          updated_at: new Date().toISOString()
        })
        .eq('id', predictionId);
    } catch (e) {
      console.warn('[SETTLEMENT] Failed to mark prediction settled (will still proceed):', e);
    }

    // 2) Update entries to won/lost and set computed payouts (CRYPTO rail only)
    try {
      if (Array.isArray(cryptoEntries) && cryptoEntries.length > 0) {
        // Index winner payout by user
        const payoutByUser = new Map<string, number>();
        for (const w of settlement.winners) {
          payoutByUser.set(w.user_id, Number(w.payoutUSD || 0));
        }

        // Group winning entries by user to pro-rate user payout across their winning entries
        const winningEntriesByUser = new Map<string, Array<{ id: string; amount: number }>>();
        const losers: Array<{ id: string; user_id: string; amount: number }> = [];
        for (const e of cryptoEntries as any[]) {
          const isWinnerEntry = e.option_id === winningOptionId;
          if (isWinnerEntry) {
            const arr = winningEntriesByUser.get(e.user_id) || [];
            arr.push({ id: e.id, amount: Number(e.amount || 0) });
            winningEntriesByUser.set(e.user_id, arr);
          } else {
            losers.push({ id: e.id, user_id: e.user_id, amount: Number(e.amount || 0) });
          }
        }

        // Apply payouts to winners
        for (const [user, entries] of winningEntriesByUser.entries()) {
          const userPayout = payoutByUser.get(user) || 0;
          const totalStake = entries.reduce((s, r) => s + r.amount, 0);
          let remaining = Math.round(userPayout * 100); // cents

          for (let i = 0; i < entries.length; i++) {
            const ent = entries[i] as any;
            // Pro-rata by stake
            const share = totalStake > 0 ? ent.amount / totalStake : 0;
            // Round to cents; allocate remainder to last entry
            const cents = i === entries.length - 1 ? remaining : Math.round(userPayout * 100 * share);
            remaining -= i === entries.length - 1 ? remaining : cents;
            const payoutUSD = Math.max(cents / 100, 0);

            await supabase
              .from('prediction_entries')
              .update({
                status: 'won',
                actual_payout: payoutUSD,
                updated_at: new Date().toISOString()
              })
              .eq('id', (ent as any).id);
          }

          // Record a single pending payout activity for the user (informational; on-chain claim will credit)
          try {
            await supabase
              .from('wallet_transactions')
              .insert({
                user_id: user,
                direction: 'credit',
                type: 'deposit',
                channel: 'payout',
                provider: 'crypto-base-usdc',
                amount: userPayout,
                currency: 'USD',
                status: 'pending',
                // Idempotency: one pending payout marker per user per prediction
                external_ref: `settlement:${predictionId}:payout_pending:${user}`,
                prediction_id: predictionId,
                description: 'Win recorded - claim on-chain to receive funds',
                meta: {
                  reason: 'win_pending_claim',
                  merkle_root: settlement.root,
                }
              } as any)
              .then(({ error }) => {
                if (error && (error as any).code !== '23505') {
                  console.warn('[SETTLEMENT] pending payout tx insert error (non-fatal):', error);
                }
              });
          } catch (payoutActivityErr) {
            console.warn('[SETTLEMENT] Failed to create pending payout activity:', payoutActivityErr);
          }
        }

        // Mark losers and record loss activity
        for (const l of losers) {
          await supabase
            .from('prediction_entries')
            .update({
              status: 'lost',
              actual_payout: 0,
              updated_at: new Date().toISOString()
            })
            .eq('id', l.id);

          try {
            await supabase
              .from('wallet_transactions')
              .insert({
                user_id: l.user_id,
                direction: 'debit',
                type: 'withdraw',
                channel: 'settlement_loss',
                provider: 'crypto-base-usdc',
                amount: l.amount,
                currency: 'USD',
                status: 'completed',
                // Idempotency: prevent duplicate loss rows if settlement is retried
                external_ref: `settlement:${predictionId}:loss:${l.id}`,
                prediction_id: predictionId,
                entry_id: l.id,
                description: 'Loss recorded at settlement',
                meta: { reason: 'settled_loss' }
              } as any)
              .then(({ error }) => {
                if (error && (error as any).code !== '23505') {
                  console.warn('[SETTLEMENT] merkle loss tx insert error (non-fatal):', error);
                }
              });
          } catch (lossTxErr) {
            console.warn('[SETTLEMENT] Failed to record loss activity:', lossTxErr);
          }
        }
      }
    } catch (distErr) {
      console.warn('[SETTLEMENT] Failed to apply entry outcomes:', distErr);
    }

    // 3) Mark all escrow locks for this prediction as consumed (DB-side) to avoid lingering locks
    try {
      const { error: lockErr } = await supabase
        .from('escrow_locks')
        .update({
          status: 'consumed',
          state: 'consumed',
          consumed_at: new Date().toISOString(),
        } as any)
        .eq('prediction_id', predictionId)
        .eq('status', 'locked');
      if (lockErr) {
        console.warn('[SETTLEMENT] Failed to mark locks consumed:', lockErr);
      }
    } catch (lockCatch) {
      console.warn('[SETTLEMENT] Exception consuming locks:', lockCatch);
    }

    // Response payload for the creator’s wallet to submit on-chain
    return res.json({
      success: true,
      data: {
        predictionId,
        title: prediction.title,
        winningOptionId,
        merkleRoot: settlement.root,
        platformFeeUnits: settlement.platformFeeUnits.toString(),
        creatorFeeUnits: settlement.creatorFeeUnits.toString(),
        leaves: settlement.leaves.map((l) => ({
          user_id: l.user_id,
          address: l.address,
          amountUnits: l.amountUnits.toString(),
          leaf: l.leaf,
          proof: l.proof
        })),
        summary: {
          platformFeeUSD: settlement.platformFeeUSD,
          creatorFeeUSD: settlement.creatorFeeUSD,
          payoutPoolUSD: settlement.payoutPoolUSD,
          prizePoolUSD: settlement.prizePoolUSD,
          winnersCount: settlement.winners.length
        }
      },
      message: 'Merkle settlement prepared. Submit root on-chain from creator wallet.',
      version: VERSION
    });
  } catch (error: any) {
    console.error('Error in manual/merkle settlement:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error?.message || 'Failed to prepare Merkle settlement',
      version: VERSION
    });
  }
});

// POST /api/v2/settlement/manual/merkle/posted - record on-chain posting (tx + root)
router.post('/manual/merkle/posted', async (req, res) => {
  try {
    const { predictionId, txHash, root } = req.body as { predictionId?: string; txHash?: string; root?: string };
    if (!predictionId || !txHash) {
      return res.status(400).json({ error: 'bad_request', message: 'predictionId and txHash are required', version: VERSION });
    }

    await recordOnchainPosted({ predictionId, txHash, root: root || null });

    return res.json({ success: true, version: VERSION });
  } catch (err: any) {
    console.error('[SETTLEMENT] mark posted failed:', err);
    return res.status(500).json({ error: 'internal', message: err?.message || 'Failed to mark posted', version: VERSION });
  }
});

// POST /api/v2/settlement/auto-close - Auto-close expired predictions
router.post('/auto-close', async (req, res) => {
  try {
    console.log('🕐 Auto-closing expired predictions...');
    
    // Find all open predictions past their entry deadline
    const { data: expiredPredictions, error: fetchError } = await supabase
      .from('predictions')
      .select('*')
      .eq('status', 'open')
      .lt('entry_deadline', new Date().toISOString());

    if (fetchError) {
      console.error('Error fetching expired predictions:', fetchError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch expired predictions',
        version: VERSION
      });
    }

    if (!expiredPredictions || expiredPredictions.length === 0) {
      return res.json({
        success: true,
        data: { closedCount: 0 },
        message: 'No expired predictions to close',
        version: VERSION
      });
    }

    console.log(`📋 Found ${expiredPredictions.length} expired predictions to close`);

    // Close all expired predictions
    const { error: updateError } = await supabase
      .from('predictions')
      .update({ 
        status: 'closed',
        updated_at: new Date().toISOString()
      })
      .in('id', expiredPredictions.map(p => p.id));

    if (updateError) {
      console.error('Error closing expired predictions:', updateError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to close expired predictions',
        version: VERSION
      });
    }

    console.log(`✅ Closed ${expiredPredictions.length} expired predictions`);

    return res.json({
      success: true,
      data: { 
        closedCount: expiredPredictions.length,
        closedPredictions: expiredPredictions.map(p => ({ id: p.id, title: p.title }))
      },
      message: `Closed ${expiredPredictions.length} expired predictions`,
      version: VERSION
    });

  } catch (error) {
    console.error('Error in auto-close:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to auto-close expired predictions',
      version: VERSION
    });
  }
});

// POST /api/v2/settlement/auto-settle - Auto-settle closed predictions (simplified)
router.post('/auto-settle', async (req, res) => {
  try {
    console.log('⚖️ Auto-settling closed predictions...');
    
    // Find all closed predictions that haven't been settled yet
    const { data: closedPredictions, error: fetchError } = await supabase
      .from('predictions')
      .select(`
        *,
        options:prediction_options!prediction_options_prediction_id_fkey(*),
        entries:prediction_entries(*)
      `)
      .eq('status', 'closed')
      .is('settled_at', null);

    if (fetchError) {
      console.error('Error fetching closed predictions:', fetchError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch closed predictions',
        version: VERSION
      });
    }

    if (!closedPredictions || closedPredictions.length === 0) {
      return res.json({
        success: true,
        data: { settledCount: 0 },
        message: 'No closed predictions to settle',
        version: VERSION
      });
    }

    console.log(`🎯 Found ${closedPredictions.length} closed predictions to settle`);

    const settlementResults = [];

    for (const prediction of closedPredictions) {
      try {
        console.log(`🔄 Processing prediction: ${prediction.title} (${prediction.id})`);
        
        const entries = prediction.entries || [];
        
        if (entries.length === 0) {
          // No participants - just mark as settled
          await supabase
            .from('predictions')
            .update({ 
              status: 'settled',
              settled_at: new Date().toISOString()
            })
            .eq('id', prediction.id);
          
          settlementResults.push({
            predictionId: prediction.id,
            title: prediction.title,
            result: 'no_participants',
            winnersCount: 0,
            totalPayout: 0
          });
          continue;
        }

        // For closed predictions without manual settlement, we should NOT auto-determine winners
        // Instead, we should either:
        // 1. Refund all participants if no settlement is provided
        // 2. Wait for manual settlement by creator
        // 3. Mark as requiring settlement
        
        console.log(`⚠️ Prediction ${prediction.id} is closed but needs manual settlement`);
        
        // For now, let's refund all participants since no winner was determined
        const totalPool = prediction.pool_total || 0;
        let totalRefunded = 0;

        // Refund all participants their original stake
        for (const entry of entries) {
          const refundAmount = entry.amount || 0;
          
          await supabase
            .from('prediction_entries')
            .update({
              status: 'refunded',
              actual_payout: refundAmount, // Return original stake
              updated_at: new Date().toISOString()
            })
            .eq('id', entry.id);

          totalRefunded += refundAmount;
        }

        // Mark prediction as requiring settlement
        await supabase
          .from('predictions')
          .update({ 
            status: 'awaiting_settlement',
            updated_at: new Date().toISOString()
          })
          .eq('id', prediction.id);

        settlementResults.push({
          predictionId: prediction.id,
          title: prediction.title,
          result: 'refunded_awaiting_settlement',
          winnersCount: 0,
          losersCount: 0,
          totalRefunded: totalRefunded,
          message: 'All participants refunded - awaiting manual settlement'
        });

        console.log(`💰 Refunded prediction ${prediction.id}: $${totalRefunded.toFixed(2)} returned to ${entries.length} participants`);

      } catch (error) {
        console.error(`❌ Error settling prediction ${prediction.id}:`, error);
        settlementResults.push({
          predictionId: prediction.id,
          title: prediction.title,
          result: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return res.json({
      success: true,
      data: { 
        settledCount: settlementResults.filter(r => r.result === 'settled' || r.result === 'no_participants').length,
        results: settlementResults
      },
      message: `Processed ${settlementResults.length} predictions for settlement`,
      version: VERSION
    });

  } catch (error) {
    console.error('Error in auto-settle:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to auto-settle predictions',
      version: VERSION
    });
  }
});

// GET /api/v2/settlement/:predictionId/status - Get settlement status for participants
router.get('/:predictionId/status', async (req, res) => {
  try {
    const { predictionId } = req.params;
    const userId = req.query.userId as string;
    
    console.log(`📋 Getting settlement status for prediction ${predictionId}, user ${userId}`);
    
    // Get prediction details
    const { data: prediction, error: predictionError } = await supabase
      .from('predictions')
      .select(`
        *,
        options:prediction_options!prediction_options_prediction_id_fkey(*),
        entries:prediction_entries(*)
      `)
      .eq('id', predictionId)
      .single();

    if (predictionError || !prediction) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Prediction not found',
        version: VERSION
      });
    }

    // Check if user has an entry in this prediction
    const userEntry = prediction.entries?.find((entry: any) => entry.user_id === userId);
    if (!userEntry) {
      return res.status(403).json({
        error: 'Unauthorized',
        message: 'You are not a participant in this prediction',
        version: VERSION
      });
    }

    // Get settlement proposal if exists
    const { data: settlement, error: settlementError } = await supabase
      .from('bet_settlements')
      .select('*')
      .eq('bet_id', predictionId)
      .single();

    const response = {
      prediction: {
        id: prediction.id,
        title: prediction.title,
        status: prediction.status,
        pool_total: prediction.pool_total,
        creator_id: prediction.creator_id,
      },
      userEntry: {
        id: userEntry.id,
        option_id: userEntry.option_id,
        amount: userEntry.amount,
        status: userEntry.status,
        actual_payout: userEntry.actual_payout,
        provider: (userEntry as any).provider || null,
      },
      settlement: settlement || null,
      canValidate: prediction.status === 'closed' || prediction.status === 'awaiting_settlement',
      needsSettlement: !settlement && (prediction.status === 'closed' || prediction.status === 'awaiting_settlement')
    };

    return res.json({
      success: true,
      data: response,
      message: 'Settlement status retrieved',
      version: VERSION
    });

  } catch (error) {
    console.error('Error getting settlement status:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get settlement status',
      version: VERSION
    });
  }
});

// POST /api/v2/settlement/:predictionId/validate - Participant validates settlement
router.post('/:predictionId/validate', async (req, res) => {
  try {
    const { predictionId } = req.params;
    const { userId, action, reason } = req.body; // action: 'accept' | 'dispute'
    
    console.log(`✅ Settlement validation for prediction ${predictionId}: ${action} by user ${userId}`);
    
    // Validate required fields
    if (!userId || !action || !['accept', 'dispute'].includes(action)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'userId and valid action (accept/dispute) are required',
        version: VERSION
      });
    }

    // Check if user is a participant
    const { data: userEntry, error: entryError } = await supabase
      .from('prediction_entries')
      .select('*')
      .eq('prediction_id', predictionId)
      .eq('user_id', userId)
      .single();

    if (entryError || !userEntry) {
      return res.status(403).json({
        error: 'Unauthorized',
        message: 'You are not a participant in this prediction',
        version: VERSION
      });
    }

    // Record the validation
    const { data: validation, error: validationError } = await supabase
      .from('settlement_validations')
      .upsert({
        prediction_id: predictionId,
        user_id: userId,
        action: action,
        reason: reason || null,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'prediction_id,user_id'
      })
      .select()
      .single();

    if (validationError) {
      console.error('Error recording validation:', validationError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to record validation',
        version: VERSION
      });
    }

    // If this is a dispute, we might want to halt settlement
    if (action === 'dispute') {
      // Mark prediction as disputed
      await supabase
        .from('predictions')
        .update({ 
          status: 'disputed',
          updated_at: new Date().toISOString()
        })
        .eq('id', predictionId);
    }

    return res.json({
      success: true,
      data: validation,
      message: `Settlement ${action} recorded successfully`,
      version: VERSION
    });

  } catch (error) {
    console.error('Error validating settlement:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to validate settlement',
      version: VERSION
    });
  }
});

// POST /api/v2/settlement/:predictionId/request-finalize
// Creator (or admin) requests finalization. No wallet required.
router.post('/:predictionId/request-finalize', async (req, res) => {
  try {
    const { predictionId } = req.params;
    const { userId } = req.body as { userId?: string };
    if (!userId) {
      return res.status(400).json({ error: 'bad_request', message: 'userId is required', version: VERSION });
    }

    const admin = isAdminRequest(req);

    const { data: prediction, error: predErr } = await supabase
      .from('predictions')
      .select('id,creator_id')
      .eq('id', predictionId)
      .maybeSingle();
    if (predErr || !prediction) {
      return res.status(404).json({ error: 'not_found', message: 'Prediction not found', version: VERSION });
    }

    if (!admin && prediction.creator_id !== userId) {
      return res.status(403).json({ error: 'forbidden', message: 'Only the creator can request finalization', version: VERSION });
    }

    // If there's already an active job, return it
    const { data: activeJob } = await supabase
      .from('settlement_finalize_jobs')
      .select('id,prediction_id,requested_by,status,tx_hash,error,created_at,updated_at')
      .eq('prediction_id', predictionId)
      .in('status', ['queued', 'running'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeJob) {
      return res.json({ success: true, status: (activeJob as any).status, job: activeJob, version: VERSION });
    }

    const { data: created, error: createErr } = await supabase
      .from('settlement_finalize_jobs')
      .insert({
        prediction_id: predictionId,
        requested_by: userId,
        status: 'queued',
      } as any)
      .select('id,prediction_id,requested_by,status,tx_hash,error,created_at,updated_at')
      .single();

    if (createErr) {
      return res.status(500).json({ error: 'internal', message: 'Failed to create finalize job', version: VERSION });
    }

    return res.json({ success: true, status: 'queued', job: created, version: VERSION });
  } catch (e: any) {
    console.error('[SETTLEMENT] request-finalize failed:', e);
    return res.status(500).json({ error: 'internal', message: 'Failed to request finalization', version: VERSION });
  }
});

// GET /api/v2/settlement/:predictionId/finalize/status?userId=...
// Creator OR participant OR admin can view the finalize job status.
router.get('/:predictionId/finalize/status', async (req, res) => {
  try {
    const { predictionId } = req.params;
    const userId = req.query.userId as string | undefined;
    if (!userId) {
      return res.status(400).json({ error: 'bad_request', message: 'userId is required', version: VERSION });
    }

    const admin = isAdminRequest(req);

    const { data: prediction, error: predErr } = await supabase
      .from('predictions')
      .select('id,creator_id')
      .eq('id', predictionId)
      .maybeSingle();
    if (predErr || !prediction) {
      return res.status(404).json({ error: 'not_found', message: 'Prediction not found', version: VERSION });
    }

    if (!admin) {
      const isCreator = prediction.creator_id === userId;
      if (!isCreator) {
        const { data: entry } = await supabase
          .from('prediction_entries')
          .select('id')
          .eq('prediction_id', predictionId)
          .eq('user_id', userId)
          .limit(1)
          .maybeSingle();
        if (!entry) {
          return res.status(403).json({ error: 'forbidden', message: 'Not authorized to view finalization status', version: VERSION });
        }
      }
    }

    const { data: job } = await supabase
      .from('settlement_finalize_jobs')
      .select('id,prediction_id,requested_by,status,tx_hash,error,created_at,updated_at')
      .eq('prediction_id', predictionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return res.json({
      success: true,
      data: job
        ? { status: (job as any).status, txHash: (job as any).tx_hash || null, error: (job as any).error || null, job }
        : { status: null, txHash: null, error: null, job: null },
      version: VERSION,
    });
  } catch (e: any) {
    console.error('[SETTLEMENT] finalize status failed:', e);
    return res.status(500).json({ error: 'internal', message: 'Failed to load finalization status', version: VERSION });
  }
});

// POST /api/v2/settlement/auto - Auto settlement (for future use with oracles)
router.post('/auto', async (req, res) => {
  try {
    const { predictionId, winningOptionId, oracleSource } = req.body;
    
    // This would be similar to manual settlement but triggered by external data
    // For now, return not implemented
    return res.status(501).json({
      error: 'Not implemented',
      message: 'Auto settlement not yet implemented',
      version: VERSION
    });
  } catch (error) {
    console.error('Error in auto settlement:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to auto settle prediction',
      version: VERSION
    });
  }
});

// GET /api/v2/settlement/prediction/:id - Get settlement info for a prediction
router.get('/prediction/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: settlement, error } = await supabase
      .from('bet_settlements')
      .select('*')
      .eq('bet_id', id)
      .single();

    if (error) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Settlement not found for this prediction',
        version: VERSION
      });
    }

    return res.json({
      data: settlement,
      message: 'Settlement fetched successfully',
      version: VERSION
    });
  } catch (error) {
    console.error('Error fetching settlement:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch settlement',
      version: VERSION
    });
  }
});

// GET /api/v2/settlement/missing-onchain?creatorId=...
// Lists settled predictions (by this creator) that do not have onchain_posted status yet
router.get('/missing-onchain', async (req, res) => {
  try {
    const { creatorId } = req.query as { creatorId?: string };
    if (!creatorId) {
      return res.status(400).json({ error: 'bad_request', message: 'creatorId is required', version: VERSION });
    }

    // 1) Fetch creator's settled predictions
    const { data: preds, error: predsErr } = await supabase
      .from('predictions')
      .select('id,title,winning_option_id,settled_at,status')
      .eq('creator_id', creatorId)
      .eq('status', 'settled')
      .order('settled_at', { ascending: false })
      .limit(50);
    if (predsErr) {
      console.error('[missing-onchain] load predictions error', predsErr);
      return res.status(500).json({ error: 'db_error', version: VERSION });
    }

    const results: Array<{ id: string; title: string; winningOptionId: string | null; settledAt: string | null }> = [];
    // 2) For each, check settlement status
    for (const p of preds || []) {
      const { data: s } = await supabase
        .from('bet_settlements')
        .select('status')
        .eq('bet_id', p.id)
        .maybeSingle();
      if (!s || s.status !== 'onchain_posted') {
        results.push({
          id: p.id,
          title: p.title,
          winningOptionId: (p as any).winning_option_id || null,
          settledAt: (p as any).settled_at || null
        });
      }
    }

    return res.json({ success: true, data: { items: results }, version: VERSION });
  } catch (e) {
    console.error('[missing-onchain] unhandled', e);
    return res.status(500).json({ error: 'internal', message: 'Failed to load missing on-chain settlements', version: VERSION });
  }
});

// GET /api/v2/settlement/:predictionId/history?userId=...
// Returns settlement validation history for creator/participants only
router.get('/:predictionId/history', async (req, res) => {
  try {
    const { predictionId } = req.params;
    const { userId } = req.query as { userId?: string };

    if (!userId) {
      return res.status(400).json({
        error: 'bad_request',
        message: 'userId is required',
        version: VERSION
      });
    }

    // Allow if creator OR participant
    const { data: prediction, error: predictionErr } = await supabase
      .from('predictions')
      .select('creator_id')
      .eq('id', predictionId)
      .maybeSingle();

    if (predictionErr || !prediction) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Prediction not found',
        version: VERSION
      });
    }

    const isCreator = prediction.creator_id === userId;
    if (!isCreator) {
      const { data: entry, error: entryErr } = await supabase
        .from('prediction_entries')
        .select('id')
        .eq('prediction_id', predictionId)
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

      if (entryErr) {
        console.error('Error checking participant access:', entryErr);
        return res.status(500).json({
          error: 'Database error',
          message: 'Failed to verify access',
          version: VERSION
        });
      }

      if (!entry?.id) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Only the prediction creator or participants can view settlement history',
          version: VERSION
        });
      }
    }

    const { data: validations, error: validationsError } = await supabase
      .from('settlement_validations')
      .select(`
        id,
        user_id,
        action,
        reason,
        created_at,
        status,
        user:users(username, full_name)
      `)
      .eq('prediction_id', predictionId)
      .order('created_at', { ascending: false });

    if (validationsError) {
      console.error('Error fetching settlement history:', validationsError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch settlement history',
        version: VERSION
      });
    }

    const items = validations || [];
    const accepts = items.filter((v: any) => v.action === 'accept').length;
    const disputes = items.filter((v: any) => v.action === 'dispute').length;
    const pendingDisputes = items.filter((v: any) => v.action === 'dispute' && v.status === 'pending').length;
    const lastActionAt = items.length > 0 ? (items[0] as any).created_at : null;

    return res.json({
      success: true,
      data: {
        items,
        summary: {
          accepts,
          disputes,
          pendingDisputes,
          lastActionAt
        }
      },
      version: VERSION
    });
  } catch (error) {
    console.error('Error fetching settlement history:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch settlement history',
      version: VERSION
    });
  }
});

// GET /api/v2/settlement/:predictionId/disputes - Get all disputes for a prediction
router.get('/:predictionId/disputes', async (req, res) => {
  try {
    const { predictionId } = req.params;
    
    console.log('📋 Fetching disputes for prediction:', predictionId);
    
    // Get all disputes for this prediction
    const { data: disputes, error: disputesError } = await supabase
      .from('settlement_validations')
      .select(`
        id,
        user_id,
        action,
        reason,
        created_at,
        status,
        user:users(username, full_name)
      `)
      .eq('prediction_id', predictionId)
      .eq('action', 'dispute')
      .order('created_at', { ascending: false });

    if (disputesError) {
      console.error('Error fetching disputes:', disputesError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch disputes',
        version: VERSION
      });
    }

    const totalDisputes = disputes?.length || 0;
    const pendingDisputes = disputes?.filter(d => d.status === 'pending').length || 0;

    console.log(`✅ Found ${totalDisputes} disputes (${pendingDisputes} pending)`);

    return res.json({
      success: true,
      data: {
        disputes: disputes || [],
        totalDisputes,
        pendingDisputes
      },
      version: VERSION
    });

  } catch (error) {
    console.error('Error fetching disputes:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch disputes',
      version: VERSION
    });
  }
});

// POST /api/v2/settlement/:predictionId/dispute - Create a dispute for a settled prediction
router.post('/:predictionId/dispute', async (req, res) => {
  try {
    const { predictionId } = req.params;
    const { userId, reason, evidenceUrl, evidence } = req.body;

    if (!userId || !reason) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'userId and reason are required',
        version: VERSION
      });
    }

    // Verify user has an entry in this prediction
    const { data: entry, error: entryError } = await supabase
      .from('prediction_entries')
      .select('id')
      .eq('prediction_id', predictionId)
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (entryError || !entry) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You must have participated in this prediction to dispute',
        version: VERSION
      });
    }

    // Check if prediction is settled
    const { data: prediction, error: predictionError } = await supabase
      .from('predictions')
      .select('status')
      .eq('id', predictionId)
      .maybeSingle();

    if (predictionError || prediction?.status !== 'settled') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Can only dispute settled predictions',
        version: VERSION
      });
    }

    // Check for existing open disputes from this user
    const { data: existingDispute } = await supabase
      .from('disputes')
      .select('id')
      .eq('prediction_id', predictionId)
      .eq('user_id', userId)
      .eq('status', 'open')
      .maybeSingle();

    if (existingDispute) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'You already have an open dispute for this prediction',
        version: VERSION
      });
    }

    // Get prediction details for notifications
    const { data: predictionDetails } = await supabase
      .from('predictions')
      .select('id, title, creator_id')
      .eq('id', predictionId)
      .maybeSingle();

    // Create dispute
    const { data: dispute, error: disputeError } = await supabase
      .from('disputes')
      .insert({
        prediction_id: predictionId,
        user_id: userId,
        reason,
        evidence_url: evidenceUrl || null,
        evidence: evidence || [],
        status: 'open'
      })
      .select()
      .single();

    if (disputeError) {
      console.error('Dispute creation error:', disputeError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to create dispute',
        version: VERSION
      });
    }

    // Phase 4C: Notify prediction creator about dispute
    if (predictionDetails?.creator_id && predictionDetails.creator_id !== userId) {
      try {
        await createNotification({
          userId: predictionDetails.creator_id,
          type: 'dispute',
          title: 'Dispute opened',
          body: `A dispute has been opened for "${predictionDetails.title}".`,
          href: `/predictions/${predictionId}`,
          metadata: {
            predictionId,
            predictionTitle: predictionDetails.title,
            disputeId: dispute.id,
            fromUserId: userId,
          },
          externalRef: `notif:dispute:${dispute.id}:opened:${predictionDetails.creator_id}`,
        }).catch((err) => {
          console.warn(`[Notifications] Failed to notify creator about dispute:`, err);
        });
      } catch (err) {
        console.warn(`[Notifications] Error creating dispute notification for creator:`, err);
      }
    }

    return res.status(201).json({
      success: true,
      data: { dispute },
      message: 'Dispute created successfully',
      version: VERSION
    });

  } catch (error: any) {
    console.error('Error creating dispute:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error?.message || 'Failed to create dispute',
      version: VERSION
    });
  }
});

// POST /api/v2/settlement/:predictionId/resolve-disputes - Resolve disputes for a prediction
router.post('/:predictionId/resolve-disputes', async (req, res) => {
  try {
    const { predictionId } = req.params;
    const { action, reason, newWinningOption, creatorId } = req.body;
    
    console.log('🔨 Resolving disputes for prediction:', predictionId, 'Action:', action);
    
    // Validate required fields
    if (!action || !reason || !creatorId) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'action, reason, and creatorId are required',
        version: VERSION
      });
    }

    // Verify creator ownership
    const { data: prediction, error: predictionError } = await supabase
      .from('predictions')
      .select('creator_id')
      .eq('id', predictionId)
      .single();

    if (predictionError || !prediction) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Prediction not found',
        version: VERSION
      });
    }

    if (prediction.creator_id !== creatorId) {
      return res.status(403).json({
        error: 'Unauthorized',
        message: 'Only the prediction creator can resolve disputes',
        version: VERSION
      });
    }

    // Update all pending disputes to resolved
    const { error: updateError } = await supabase
      .from('settlement_validations')
      .update({ 
        status: 'resolved',
        resolution_reason: reason,
        resolved_at: new Date().toISOString()
      })
      .eq('prediction_id', predictionId)
      .eq('action', 'dispute')
      .eq('status', 'pending');

    if (updateError) {
      console.error('Error updating disputes:', updateError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to update disputes',
        version: VERSION
      });
    }

    // Handle different resolution actions
    let newPredictionStatus = 'settled';
    
    if (action === 'accept') {
      // Refund all participants
      console.log('💰 Refunding all participants due to accepted disputes');
      
      // Update all prediction entries to refunded
      const { error: refundError } = await supabase
        .from('prediction_entries')
        .update({ 
          status: 'refunded',
          actual_payout: 0 // Will be updated with actual refund amount below
        })
        .eq('prediction_id', predictionId);

      if (refundError) {
        console.error('Error processing refunds:', refundError);
      }
      
      newPredictionStatus = 'refunded';
      
    } else if (action === 'revise' && newWinningOption) {
      // Re-settle with new winning option
      console.log('🔄 Re-settling with new winning option:', newWinningOption);
      
      // This would trigger a new settlement process
      // For now, we'll just update the status
      newPredictionStatus = 'awaiting_settlement';
      
    } else if (action === 'reject') {
      // Maintain original settlement
      console.log('✋ Maintaining original settlement');
      newPredictionStatus = 'settled';
    }

    // Update prediction status
    const { error: statusError } = await supabase
      .from('predictions')
      .update({ 
        status: newPredictionStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', predictionId);

    if (statusError) {
      console.error('Error updating prediction status:', statusError);
    }

    console.log('✅ Disputes resolved successfully');

    return res.json({
      success: true,
      data: {
        action,
        newStatus: newPredictionStatus,
        message: `Disputes ${action}ed successfully`
      },
      message: 'Disputes resolved successfully',
      version: VERSION
    });

  } catch (error) {
    console.error('Error resolving disputes:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to resolve disputes',
      version: VERSION
    });
  }
});

export default router;