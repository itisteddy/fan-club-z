// @ts-nocheck
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';

jest.mock('../config/database', () => ({
  supabase: { from: jest.fn() },
  db: {},
}));

jest.mock('../services/realtime', () => ({
  emitSettlementComplete: jest.fn(),
  emitWalletUpdate: jest.fn(),
  emitPredictionUpdate: jest.fn(),
}));

import settlementRouter from '../routes/settlement';
import { supabase } from '../config/database';

const app = express();
app.use(express.json());
app.use('/api/v2/settlement', settlementRouter);

describe('settlement repeat protection regression', () => {
  const predictionId = '9b82c099-f831-44fa-97fb-7558de9c41df';
  const creatorId = 'df10d5a2-a75f-4a06-a81f-bfd84eaa2ef4';
  const winningOptionId = 'def5b4d2-479a-4027-b06d-4d7466608776';

  let prediction: any;
  let settlementRow: any;
  let predictionMutationCount: number;
  let settlementUpsertCount: number;

  class QueryBuilder {
    table: string;
    filters: Record<string, any>;
    selected: string | null;
    updatePayload: any;
    pendingUpsert: any;

    constructor(table: string) {
      this.table = table;
      this.filters = {};
      this.selected = null;
      this.updatePayload = null;
      this.pendingUpsert = null;
    }

    select(sel: string) {
      this.selected = sel;
      return this;
    }

    eq(key: string, val: any) {
      this.filters[key] = val;
      return this;
    }

    is(key: string, val: any) {
      this.filters[`is:${key}`] = val;
      return this;
    }

    update(payload: any) {
      this.updatePayload = payload;
      return this;
    }

    upsert(payload: any) {
      this.pendingUpsert = payload;
      return this.exec();
    }

    single() {
      return this.execSingle(false);
    }

    maybeSingle() {
      return this.execSingle(true);
    }

    then(resolve: any, reject: any) {
      return this.exec().then(resolve, reject);
    }

    private async exec() {
      if (this.table === 'prediction_entries') {
        return { data: [], error: null };
      }

      if (this.table === 'bet_settlements' && this.pendingUpsert) {
        settlementUpsertCount += 1;
        settlementRow = {
          ...(settlementRow || {}),
          ...this.pendingUpsert,
          bet_id: predictionId,
          winning_option_id: this.pendingUpsert.winning_option_id || winningOptionId,
          settlement_time: this.pendingUpsert.settlement_time || prediction.settled_at,
        };
        return { data: settlementRow, error: null };
      }

      return this.execSingle(true);
    }

    private async execSingle(maybe: boolean) {
      if (this.table === 'predictions') {
        if (this.updatePayload) {
          if (this.filters.id !== predictionId) return { data: null, error: null };
          if (this.filters['is:settled_at'] === null && prediction.settled_at != null) {
            return { data: null, error: null };
          }
          prediction = {
            ...prediction,
            ...this.updatePayload,
            winning_option_id: this.updatePayload.winning_option_id ?? prediction.winning_option_id,
          };
          predictionMutationCount += 1;
          return { data: { id: prediction.id }, error: null };
        }

        if (this.filters.id !== predictionId) {
          return maybe ? { data: null, error: null } : { data: null, error: { message: 'not found' } };
        }

        return { data: { ...prediction }, error: null };
      }

      if (this.table === 'prediction_options') {
        const matches = this.filters.id === winningOptionId && this.filters.prediction_id === predictionId;
        if (!matches) return { data: null, error: { message: 'not found' } };
        return { data: { id: winningOptionId, prediction_id: predictionId, label: 'Yes' }, error: null };
      }

      if (this.table === 'bet_settlements') {
        if (this.filters.bet_id !== predictionId) return { data: null, error: null };
        return { data: settlementRow ? { ...settlementRow } : null, error: null };
      }

      return { data: null, error: null };
    }
  }

  beforeEach(() => {
    prediction = {
      id: predictionId,
      creator_id: creatorId,
      title: 'Regression fixture',
      status: 'closed',
      settled_at: null,
      winning_option_id: null,
      resolution_reason: null,
      resolution_source_url: null,
      platform_fee_percentage: 2.5,
      creator_fee_percentage: 1,
      updated_at: '2026-03-13T22:57:43.908+00:00',
    };
    settlementRow = null;
    predictionMutationCount = 0;
    settlementUpsertCount = 0;

    (supabase.from as jest.Mock).mockImplementation((table: string) => new QueryBuilder(table));
  });

  it('allows first settlement, blocks repeat /manual/merkle and /manual from mutating terminal state', async () => {
    const first = await request(app)
      .post('/api/v2/settlement/manual/merkle')
      .send({ predictionId, winningOptionId, userId: creatorId });

    expect(first.status).toBe(200);
    expect(first.body.success).toBe(true);
    expect(prediction.status).toBe('settled');
    expect(prediction.settled_at).toBeTruthy();
    expect(predictionMutationCount).toBe(1);
    expect(settlementUpsertCount).toBe(1);

    const settledAtAfterFirst = prediction.settled_at;
    const updatedAtAfterFirst = prediction.updated_at;

    const secondMerkle = await request(app)
      .post('/api/v2/settlement/manual/merkle')
      .send({ predictionId, winningOptionId, userId: creatorId });

    expect(secondMerkle.status).toBe(200);
    expect(secondMerkle.body.ok).toBe(true);
    expect(secondMerkle.body.alreadySettled).toBe(true);

    const secondManual = await request(app)
      .post('/api/v2/settlement/manual')
      .send({ predictionId, winningOptionId, userId: creatorId });

    expect(secondManual.status).toBe(200);
    expect(secondManual.body.ok).toBe(true);
    expect(secondManual.body.alreadySettled).toBe(true);

    expect(predictionMutationCount).toBe(1);
    expect(settlementUpsertCount).toBe(1);
    expect(prediction.settled_at).toBe(settledAtAfterFirst);
    expect(prediction.updated_at).toBe(updatedAtAfterFirst);
  });
});
