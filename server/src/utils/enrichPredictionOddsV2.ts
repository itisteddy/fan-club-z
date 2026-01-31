/**
 * Odds V2: enrich prediction with pool cents, fee bps, and reference odds for client.
 * Safe to call on any prediction; adds oddsV2 envelope when options and pool_total exist.
 */
import { computeReferenceMultiple } from '@fanclubz/shared';

const DEFAULT_PLATFORM_FEE_BPS = 250;
const DEFAULT_CREATOR_FEE_BPS = 100;

export function enrichPredictionWithOddsV2(prediction: any): any {
  if (!prediction || !prediction.options || !Array.isArray(prediction.options)) return prediction;

  const poolTotalDollars = Number(prediction.pool_total) || 0;
  const totalPoolCents = Math.round(poolTotalDollars * 100);
  const platformPct = Number(prediction.platform_fee_percentage);
  const creatorPct = Number(prediction.creator_fee_percentage);
  const platformFeeBps = Number.isFinite(platformPct) ? Math.round(platformPct * 100) : DEFAULT_PLATFORM_FEE_BPS;
  const creatorFeeBps = Number.isFinite(creatorPct) ? Math.round(creatorPct * 100) : DEFAULT_CREATOR_FEE_BPS;
  const stakeMinDollars = Number(prediction.stake_min) ?? 1;
  const referenceStakeCents = Math.max(1, Math.round(stakeMinDollars * 100));
  const oddsModel = prediction.odds_model === 'pool_v2' ? 'pool_v2' : 'legacy';

  const options = prediction.options.map((opt: any) => {
    const stakedDollars = Number(opt.total_staked) || 0;
    const totalStakedCents = Math.round(stakedDollars * 100);
    let referenceMultiple: number | null = null;
    if (oddsModel === 'pool_v2') {
      referenceMultiple = computeReferenceMultiple({
        selectedPoolCents: totalStakedCents,
        totalPoolCents,
        referenceStakeCents,
        platformFeeBps,
        creatorFeeBps,
      });
    }
    return {
      ...opt,
      totalStakedCents,
      referenceMultiple: referenceMultiple ?? undefined,
    };
  });

  return {
    ...prediction,
    odds_model: oddsModel,
    totalPoolCents,
    platformFeeBps,
    creatorFeeBps,
    stakeMinCents: referenceStakeCents,
    options,
  };
}
