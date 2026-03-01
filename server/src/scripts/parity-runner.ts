import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { transfer, credit, getBalances, ZAU_CURRENCY } from '../services/walletService';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fcz',
});

async function runParity() {
  console.log('=== ZAURUM PHASE 1.5 ECONOMIC PARITY HARNESS ===');
  const client = await pool.connect();
  const reportPath = '/tmp/zaurum-parity-report.json';
  const mdPath = '/tmp/zaurum-parity-report.md';

  const userA = `parity-userA-${uuidv4()}`;
  const userB = `parity-userB-${uuidv4()}`;
  const creatorC = `parity-creatorC-${uuidv4()}`;
  const marketId = `parity-market-${uuidv4()}`;

  const report = {
    scenarios: [] as any[],
    passed: true,
  };

  try {
    // SCENARIO S1: Simple Stake + Settlement
    console.log('--- Running Scenario S1: Simple Stake + Settlement ---');
    await client.query('BEGIN');
    
    // Baseline: Legacy (manual SQL logic for claim)
    await client.query(`
      INSERT INTO wallets (user_id, currency, available_balance, reserved_balance, demo_credits_balance, updated_at)
      VALUES ($1, 'DEMO_USD', 200, 0, 200, NOW()), ($2, 'DEMO_USD', 200, 0, 200, NOW())
    `, [userA, userB]);

    // Legacy stake
    await client.query(`UPDATE wallets SET available_balance = available_balance - 100, reserved_balance = reserved_balance + 100 WHERE user_id = $1 AND currency = 'DEMO_USD'`, [userA]);
    await client.query(`UPDATE wallets SET available_balance = available_balance - 100, reserved_balance = reserved_balance + 100 WHERE user_id = $1 AND currency = 'DEMO_USD'`, [userB]);

    // Legacy settle (A wins pool of 200. No fee for simplicity in baseline)
    await client.query(`UPDATE wallets SET reserved_balance = reserved_balance - 100, available_balance = available_balance + 200 WHERE user_id = $1 AND currency = 'DEMO_USD'`, [userA]);
    await client.query(`UPDATE wallets SET reserved_balance = reserved_balance - 100 WHERE user_id = $1 AND currency = 'DEMO_USD'`, [userB]);

    const legacyResA = await client.query(`SELECT available_balance FROM wallets WHERE user_id = $1 AND currency = 'DEMO_USD'`, [userA]);
    const legacyResB = await client.query(`SELECT available_balance FROM wallets WHERE user_id = $1 AND currency = 'DEMO_USD'`, [userB]);
    const legacyAvailA = Number(legacyResA.rows[0].available_balance);
    const legacyAvailB = Number(legacyResB.rows[0].available_balance);

    await client.query('ROLLBACK');

    // Candidate: Zaurum
    await client.query('BEGIN');
    
    await credit({ to: { ownerType: 'user', ownerId: userA, bucket: 'PROMO_AVAILABLE' }, amount: 200, reference: { type: 'OPENING_BALANCE' } }, { client });
    await credit({ to: { ownerType: 'user', ownerId: userB, bucket: 'PROMO_AVAILABLE' }, amount: 200, reference: { type: 'OPENING_BALANCE' } }, { client });

    await transfer({ from: { ownerType: 'user', ownerId: userA, bucket: 'PROMO_AVAILABLE' }, to: { ownerType: 'user', ownerId: userA, bucket: 'PROMO_LOCKED' }, amount: 100, reference: { type: 'STAKE_LOCK' } }, { client });
    await transfer({ from: { ownerType: 'user', ownerId: userB, bucket: 'PROMO_AVAILABLE' }, to: { ownerType: 'user', ownerId: userB, bucket: 'PROMO_LOCKED' }, amount: 100, reference: { type: 'STAKE_LOCK' } }, { client });

    await transfer({ from: { ownerType: 'user', ownerId: userA, bucket: 'PROMO_LOCKED' }, to: { ownerType: 'user', ownerId: userA, bucket: 'PROMO_AVAILABLE' }, amount: 100, reference: { type: 'STAKE_UNLOCK' } }, { client });
    await transfer({ from: { ownerType: 'user', ownerId: userB, bucket: 'PROMO_LOCKED' }, to: { ownerType: 'system', ownerId: 'POOL', bucket: 'CASH_LOCKED' }, amount: 100, reference: { type: 'STAKE_UNLOCK' } }, { client });
    
    // Payout
    await credit({ to: { ownerType: 'user', ownerId: userA, bucket: 'PROMO_AVAILABLE' }, amount: 100, reference: { type: 'PAYOUT' } }, { client });

    const zaurumBalancesA = await getBalances(userA);
    const zaurumBalancesB = await getBalances(userB);

    await client.query('ROLLBACK');

    const s1Pass = (legacyAvailA === zaurumBalancesA.PROMO_AVAILABLE) && (legacyAvailB === zaurumBalancesB.PROMO_AVAILABLE);
    if (!s1Pass) report.passed = false;

    report.scenarios.push({
      scenarioId: 'S1',
      mode: 'zaurum_vs_legacy',
      pass: s1Pass,
      balances: {
        legacy: { userA: legacyAvailA, userB: legacyAvailB },
        zaurum: { userA: zaurumBalancesA.PROMO_AVAILABLE, userB: zaurumBalancesB.PROMO_AVAILABLE }
      }
    });

    console.log(`S1 Pass: ${s1Pass}`);

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    const mdContent = `# Zaurum Parity Report\n\n**Overall Status**: ${report.passed ? '✅ PASS' : '❌ FAIL'}\n\n` +
      report.scenarios.map(s => `### Scenario: ${s.scenarioId}\n- **Pass**: ${s.pass}\n- **Legacy A**: ${s.balances.legacy.userA} | **Zaurum A**: ${s.balances.zaurum.userA}\n- **Legacy B**: ${s.balances.legacy.userB} | **Zaurum B**: ${s.balances.zaurum.userB}`).join('\n\n');
    
    fs.writeFileSync(mdPath, mdContent);
    console.log(`Report written to ${mdPath}`);
  } catch (error) {
    console.error('Parity run failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

runParity().catch(console.error);
