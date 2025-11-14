import { supabase } from '../config/database';
import { keccak256, encodePacked, getAddress } from 'viem';

type WinnerPayout = {
  user_id: string;
  address: `0x${string}` | null;
  stakeUSD: number;
  payoutUSD: number;
  payoutUnits: bigint; // 6-decimals USDC
};

export type MerkleSettlement = {
  predictionId: string;
  winningOptionId: string;
  platformFeeUSD: number;
  creatorFeeUSD: number;
  platformFeeUnits: bigint;
  creatorFeeUnits: bigint;
  prizePoolUSD: number;
  payoutPoolUSD: number;
  winners: WinnerPayout[];
  root: `0x${string}`;
  leaves: Array<{
    user_id: string;
    address: `0x${string}`;
    amountUnits: bigint;
    leaf: `0x${string}`;
    proof: `0x${string}`[]; // filled by caller when building full proof tree if needed
  }>;
};

function usdToUnits(n: number): bigint {
  // USDC has 6 decimals
  return BigInt(Math.round(n * 1_000_000));
}

function toBytes32FromUuid(uuid: string): `0x${string}` {
  // Best-effort: strip dashes and right-pad with zeros
  const hex = uuid.replace(/-/g, '').toLowerCase().padEnd(64, '0');
  return `0x${hex}` as const;
}

function hashLeaf(args: { predictionIdHex: `0x${string}`; address: `0x${string}`; amountUnits: bigint }): `0x${string}` {
  return keccak256(
    encodePacked(
      ['bytes32', 'address', 'uint256'],
      [args.predictionIdHex, args.address, args.amountUnits]
    )
  );
}

/**
 * Build a simple Merkle root from leaves using keccak256 with pairwise sorted hashing.
 * Returns the root and a function to compute proofs on-demand.
 */
function buildMerkle(
  leaves: `0x${string}`[]
): { root: `0x${string}`; getProof: (leaf: `0x${string}`) => `0x${string}`[] } {
  const uniqueLeaves = Array.from(new Set(leaves));
  if (uniqueLeaves.length === 0) {
    return { root: keccak256('0x'), getProof: () => [] };
  }

  const tree: `0x${string}`[][] = [];
  tree.push(uniqueLeaves.slice().sort());

  while (tree[tree.length - 1].length > 1) {
    const prev = tree[tree.length - 1];
    const next: `0x${string}`[] = [];
    for (let i = 0; i < prev.length; i += 2) {
      if (i + 1 === prev.length) {
        next.push(prev[i]); // carry last node up if odd
      } else {
        const a = prev[i];
        const b = prev[i + 1];
        const [x, y] = a.toLowerCase() < b.toLowerCase() ? [a, b] : [b, a];
        next.push(keccak256(encodePacked(['bytes32', 'bytes32'], [x, y])));
      }
    }
    tree.push(next);
  }

  const root = tree[tree.length - 1][0];

  function getProof(leaf: `0x${string}`): `0x${string}`[] {
    const proof: `0x${string}`[] = [];
    let idx = tree[0].indexOf(leaf);
    if (idx === -1) return [];
    for (let level = 0; level < tree.length - 1; level++) {
      const nodes = tree[level];
      const isRightNode = idx % 2 === 1;
      const pairIndex = isRightNode ? idx - 1 : idx + 1;
      if (pairIndex < nodes.length) {
        proof.push(nodes[pairIndex]);
      }
      idx = Math.floor(idx / 2);
    }
    return proof;
  }

  return { root, getProof };
}

/**
 * Computes on-chain settlement distribution (fees on losing stake only),
 * resolves winner addresses, and builds a Merkle tree for claims.
 */
export async function computeMerkleSettlement(args: {
  predictionId: string;
  winningOptionId: string;
}): Promise<MerkleSettlement> {
  const { predictionId, winningOptionId } = args;

  // Load prediction and entries
  const { data: prediction, error: predictionError } = await supabase
    .from('predictions')
    .select('*')
    .eq('id', predictionId)
    .maybeSingle();
  if (predictionError || !prediction) {
    throw new Error('Prediction not found');
  }

  const { data: entries, error: entriesError } = await supabase
    .from('prediction_entries')
    .select('*')
    .eq('prediction_id', predictionId);
  if (entriesError) {
    throw new Error('Failed to load entries');
  }

  const winners = (entries || []).filter((e: any) => e.option_id === winningOptionId);
  const losers = (entries || []).filter((e: any) => e.option_id !== winningOptionId);

  const totalWinningStake = winners.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalLosingStake = losers.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const platformFeePct = Number.isFinite(prediction.platform_fee_percentage)
    ? Number(prediction.platform_fee_percentage)
    : 2.5;
  const creatorFeePct = Number.isFinite(prediction.creator_fee_percentage)
    ? Number(prediction.creator_fee_percentage)
    : 1.0;

  const platformFeeUSD = Math.max(Math.round(((totalLosingStake * platformFeePct) / 100) * 100) / 100, 0);
  const creatorFeeUSD = Math.max(Math.round(((totalLosingStake * creatorFeePct) / 100) * 100) / 100, 0);
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
  for (const w of winners) {
    const prev = byUser.get(w.user_id);
    const inc = Number(w.amount || 0);
    const addressRaw = latestByUser.get(w.user_id) || null;
    const address = addressRaw ? (getAddress(addressRaw) as `0x${string}`) : null;
    if (!prev) {
      byUser.set(w.user_id, { user_id: w.user_id, stakeUSD: inc, address });
    } else {
      prev.stakeUSD += inc;
      // prefer latest normalized address if present
      prev.address = prev.address || address;
    }
  }

  // Deterministic allocation of payout units using integer math to avoid rounding drift:
  // units_i = floor(payoutPoolUnits * stakeCents_i / totalWinningStakeCents)
  // Distribute remaining units to largest fractional remainders (by stake, then address).
  const stakeCentsByUser = Array.from(byUser.values()).map((u) => ({
    ...u,
    stakeCents: Math.round(u.stakeUSD * 100),
  }));
  const totalWinningStakeCents = stakeCentsByUser.reduce((s, u) => s + u.stakeCents, 0);

  const provisional = stakeCentsByUser.map((u) => {
    const numerator = BigInt(u.stakeCents) * payoutPoolUnits;
    const denom = BigInt(totalWinningStakeCents || 1);
    const units = numerator / denom; // floor
    const remainder = numerator % denom;
    return { ...u, units, remainder };
  });

  // Compute remainder units to distribute
  const allocated = provisional.reduce((s, u) => s + u.units, 0n);
  let leftover = payoutPoolUnits - allocated;

  // Rank by remainder desc, then by address checksum to make deterministic
  provisional.sort((a, b) => {
    if (a.remainder === b.remainder) {
      const ax = (a.address || '0x').toLowerCase();
      const bx = (b.address || '0x').toLowerCase();
      return ax < bx ? -1 : ax > bx ? 1 : 0;
    }
    return a.remainder > b.remainder ? -1 : 1;
  });
  for (let i = 0; i < provisional.length && leftover > 0n; i++) {
    provisional[i].units += 1n;
    leftover -= 1n;
  }

  const winnersPayouts: WinnerPayout[] = provisional.map((u) => ({
    user_id: u.user_id,
    address: u.address,
    stakeUSD: u.stakeUSD,
    payoutUSD: Number(u.units) / 1_000_000,
    payoutUnits: u.units,
  }));

  // Build leaves for users who have an address
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


