/**
 * Entry types - normalized snake_case DTOs and camelCase domain models
 * Use mapEntry() at API boundaries to convert DTO -> domain model
 */

export type EntryDTO = {
  id: string;
  user_id: string;
  prediction_id: string;
  option_id: string;
  amount_usd: number;
  created_at: string;
  updated_at?: string;
};

export type Entry = {
  id: string;
  userId: string;
  predictionId: string;
  optionId: string;
  amountUSD: number;
  createdAt: Date;
  updatedAt?: Date;
};

export const mapEntry = (d: EntryDTO): Entry => ({
  id: d.id,
  userId: d.user_id,
  predictionId: d.prediction_id,
  optionId: d.option_id,
  amountUSD: d.amount_usd,
  createdAt: new Date(d.created_at),
  updatedAt: d.updated_at ? new Date(d.updated_at) : undefined,
});

export const mapEntryToDTO = (e: Entry): EntryDTO => ({
  id: e.id,
  user_id: e.userId,
  prediction_id: e.predictionId,
  option_id: e.optionId,
  amount_usd: e.amountUSD,
  created_at: e.createdAt.toISOString(),
  updated_at: e.updatedAt?.toISOString(),
});
