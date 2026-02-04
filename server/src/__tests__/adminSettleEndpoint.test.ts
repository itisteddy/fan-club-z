/**
 * Integration-style tests for admin settlement endpoint.
 * POST /api/v2/admin/predictions/:predictionId/settle and alias .../outcome
 * Verifies: 401 without auth, 400 on invalid/empty body with requestId and details.
 */
import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';

const TEST_ADMIN_KEY = 'test-admin-key-settle-integration';
process.env.ADMIN_API_KEY = TEST_ADMIN_KEY;

import { adminRouter } from '../routes/admin';

const app = express();
app.use(express.json());
app.use('/api/v2/admin', adminRouter);

const predictionId = '00000000-0000-0000-0000-000000000001';
const validOptionId = '77fdcf15-7557-4335-b56d-ed7060dffbbe';

describe('POST /api/v2/admin/predictions/:predictionId/settle', () => {
  afterAll(() => {
    delete process.env.ADMIN_API_KEY;
  });

  it('returns 401 when no admin auth (no x-admin-key, no userId)', async () => {
    const res = await request(app)
      .post(`/api/v2/admin/predictions/${predictionId}/settle`)
      .set('Content-Type', 'application/json')
      .send({ winningOptionId: validOptionId });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
    expect(res.body.message).toMatch(/admin/i);
  });

  it('returns 400 for empty body and includes requestId', async () => {
    const res = await request(app)
      .post(`/api/v2/admin/predictions/${predictionId}/settle`)
      .set('Content-Type', 'application/json')
      .set('x-admin-key', TEST_ADMIN_KEY)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Bad Request');
    expect(res.body.requestId).toBeDefined();
    expect(String(res.body.requestId)).toMatch(/^settle-/);
    expect(res.body.details).toBeDefined();
    expect(Array.isArray(res.body.details)).toBe(true);
  });

  it('returns 400 for body missing winningOptionId/optionId with validation details', async () => {
    const res = await request(app)
      .post(`/api/v2/admin/predictions/${predictionId}/settle`)
      .set('Content-Type', 'application/json')
      .set('x-admin-key', TEST_ADMIN_KEY)
      .send({ resolutionReason: 'Just because' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Bad Request');
    expect(res.body.requestId).toBeDefined();
    expect(res.body.message).toMatch(/optionId|winningOptionId|required/i);
    expect(res.body.details).toBeDefined();
  });

  it('returns 400 for invalid winningOptionId (not a UUID)', async () => {
    const res = await request(app)
      .post(`/api/v2/admin/predictions/${predictionId}/settle`)
      .set('Content-Type', 'application/json')
      .set('x-admin-key', TEST_ADMIN_KEY)
      .send({ winningOptionId: 'not-a-uuid' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Bad Request');
    expect(res.body.requestId).toBeDefined();
    expect(res.body.details).toBeDefined();
  });
});

describe('POST /api/v2/admin/predictions/:predictionId/outcome (alias)', () => {

  it('returns 401 when no admin auth', async () => {
    const res = await request(app)
      .post(`/api/v2/admin/predictions/${predictionId}/outcome`)
      .set('Content-Type', 'application/json')
      .send({ winningOptionId: validOptionId });
    expect(res.status).toBe(401);
  });

  it('returns 400 for empty body with requestId (same contract as /settle)', async () => {
    const res = await request(app)
      .post(`/api/v2/admin/predictions/${predictionId}/outcome`)
      .set('Content-Type', 'application/json')
      .set('x-admin-key', TEST_ADMIN_KEY)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.requestId).toBeDefined();
    expect(res.body.error).toBe('Bad Request');
  });
});
