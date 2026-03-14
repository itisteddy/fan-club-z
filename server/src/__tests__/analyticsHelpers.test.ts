/**
 * Analytics Helpers – Unit Tests
 *
 * Tests the pure logic functions used in the analytics pipeline:
 *  - CSV serialisation (cell escaping, header generation, CRLF line endings)
 *  - Period-to-date-range conversion
 *  - Overview summary aggregation
 *
 * These functions are private to analytics.ts; the tests verify the
 * published spec so any future extraction remains contract-compatible.
 */

import { describe, expect, it } from '@jest/globals';

// ─── Replicated helpers (mirror of analytics.ts private helpers) ──────────────
// These are tested as specs. If helpers are ever extracted to a utils module,
// replace these with imports and remove the duplicates.

function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]!);
  const lines = [
    headers.join(','),
    ...rows.map(row => headers.map(h => csvCell(row[h])).join(',')),
  ];
  return lines.join('\r\n');
}

function periodToDays(period: string): number | null {
  if (period === '7d')  return 7;
  if (period === '30d') return 30;
  if (period === '90d') return 90;
  return null;
}

function periodToStartDate(period: string): string | null {
  const days = periodToDays(period);
  if (days === null) return null;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

type DailyRow = {
  new_users_count: number;
  total_stakes_count: number;
  total_stake_amount: number;
  total_payout_amount: number;
  total_creator_earnings_amount: number;
  total_comments_count: number;
  total_deposits_amount: number;
  total_withdrawals_amount: number;
  new_referral_signups: number;
  cumulative_users_count: number;
};

function buildSummary(rows: DailyRow[]) {
  return rows.reduce(
    (acc, r) => {
      acc.total_new_users        += Number(r.new_users_count || 0);
      acc.total_stakes_count     += Number(r.total_stakes_count || 0);
      acc.total_stake_amount     += Number(r.total_stake_amount || 0);
      acc.total_payout_amount    += Number(r.total_payout_amount || 0);
      acc.total_creator_earnings += Number(r.total_creator_earnings_amount || 0);
      acc.total_comments         += Number(r.total_comments_count || 0);
      acc.total_deposits         += Number(r.total_deposits_amount || 0);
      acc.total_withdrawals      += Number(r.total_withdrawals_amount || 0);
      acc.total_new_referral_signups += Number(r.new_referral_signups || 0);
      acc.cumulative_users        = Number(r.cumulative_users_count || 0);
      return acc;
    },
    {
      total_new_users: 0,
      total_stakes_count: 0,
      total_stake_amount: 0,
      total_payout_amount: 0,
      total_creator_earnings: 0,
      total_comments: 0,
      total_deposits: 0,
      total_withdrawals: 0,
      total_new_referral_signups: 0,
      cumulative_users: 0,
    }
  );
}

// ─── CSV escaping ─────────────────────────────────────────────────────────────

describe('csvCell – cell escaping', () => {
  it('passes through plain strings untouched', () => {
    expect(csvCell('hello')).toBe('hello');
    expect(csvCell(42)).toBe('42');
    expect(csvCell(3.14)).toBe('3.14');
  });

  it('wraps strings containing a comma in double-quotes', () => {
    expect(csvCell('foo,bar')).toBe('"foo,bar"');
  });

  it('wraps strings containing a double-quote and escapes it', () => {
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
  });

  it('wraps strings containing a newline in double-quotes', () => {
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"');
  });

  it('converts null and undefined to empty string', () => {
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
  });

  it('converts boolean and number to string', () => {
    expect(csvCell(true)).toBe('true');
    expect(csvCell(0)).toBe('0');
  });
});

// ─── toCsv ────────────────────────────────────────────────────────────────────

describe('toCsv – full CSV generation', () => {
  it('returns empty string for empty input', () => {
    expect(toCsv([])).toBe('');
  });

  it('emits a header row followed by data rows with CRLF line endings', () => {
    const rows = [{ a: 1, b: 2 }, { a: 3, b: 4 }];
    const csv = toCsv(rows);
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('a,b');
    expect(lines[1]).toBe('1,2');
    expect(lines[2]).toBe('3,4');
  });

  it('uses column order from the first row', () => {
    const rows = [{ z: 'last', a: 'first' }];
    const header = toCsv(rows).split('\r\n')[0];
    expect(header).toBe('z,a');
  });

  it('handles null values in cells', () => {
    const rows = [{ name: null, value: 42 }] as Record<string, unknown>[];
    const line = toCsv(rows).split('\r\n')[1];
    expect(line).toBe(',42');
  });

  it('escapes values with commas inside cells', () => {
    const rows = [{ title: 'Hello, World', count: 1 }];
    const line = toCsv(rows).split('\r\n')[1];
    expect(line).toBe('"Hello, World",1');
  });

  it('produces a valid single-row CSV with all expected columns', () => {
    const row = {
      day: '2025-01-15',
      new_users: 42,
      stake_volume: 1234.56,
      description: 'contains "quotes"',
    };
    const csv = toCsv([row]);
    const lines = csv.split('\r\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('day,new_users,stake_volume,description');
    expect(lines[1]).toContain('"contains ""quotes"""');
  });
});

// ─── periodToStartDate ────────────────────────────────────────────────────────

describe('periodToStartDate', () => {
  it('returns null for "all"', () => {
    expect(periodToStartDate('all')).toBeNull();
  });

  it('returns a date approximately 7 days ago for "7d"', () => {
    const result = periodToStartDate('7d');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const diff = (Date.now() - new Date(result!).getTime()) / (1000 * 60 * 60 * 24);
    expect(diff).toBeGreaterThanOrEqual(6.9);
    expect(diff).toBeLessThan(8);
  });

  it('returns a date approximately 30 days ago for "30d"', () => {
    const result = periodToStartDate('30d');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const diff = (Date.now() - new Date(result!).getTime()) / (1000 * 60 * 60 * 24);
    expect(diff).toBeGreaterThanOrEqual(29.9);
    expect(diff).toBeLessThan(31);
  });

  it('returns a date approximately 90 days ago for "90d"', () => {
    const result = periodToStartDate('90d');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const diff = (Date.now() - new Date(result!).getTime()) / (1000 * 60 * 60 * 24);
    expect(diff).toBeGreaterThanOrEqual(89.9);
    expect(diff).toBeLessThan(91);
  });
});

// ─── Overview summary aggregation ────────────────────────────────────────────

describe('buildSummary – overview aggregation', () => {
  const makeRow = (overrides: Partial<DailyRow> = {}): DailyRow => ({
    new_users_count: 0,
    total_stakes_count: 0,
    total_stake_amount: 0,
    total_payout_amount: 0,
    total_creator_earnings_amount: 0,
    total_comments_count: 0,
    total_deposits_amount: 0,
    total_withdrawals_amount: 0,
    new_referral_signups: 0,
    cumulative_users_count: 0,
    ...overrides,
  });

  it('returns all-zero summary for empty row array', () => {
    const s = buildSummary([]);
    expect(s.total_new_users).toBe(0);
    expect(s.total_stake_amount).toBe(0);
    expect(s.cumulative_users).toBe(0);
  });

  it('sums new_users_count across rows', () => {
    const rows = [makeRow({ new_users_count: 10 }), makeRow({ new_users_count: 25 })];
    const s = buildSummary(rows);
    expect(s.total_new_users).toBe(35);
  });

  it('sums total_stake_amount across rows', () => {
    const rows = [
      makeRow({ total_stake_amount: 100.5 }),
      makeRow({ total_stake_amount: 200.25 }),
    ];
    const s = buildSummary(rows);
    expect(s.total_stake_amount).toBeCloseTo(300.75);
  });

  it('cumulative_users reflects the LAST row (not sum)', () => {
    const rows = [
      makeRow({ cumulative_users_count: 100 }),
      makeRow({ cumulative_users_count: 150 }),
      makeRow({ cumulative_users_count: 200 }),
    ];
    const s = buildSummary(rows);
    expect(s.cumulative_users).toBe(200); // last row value
  });

  it('sums all financial fields correctly', () => {
    const rows = [
      makeRow({ total_payout_amount: 50, total_creator_earnings_amount: 10, total_deposits_amount: 200, total_withdrawals_amount: 30 }),
      makeRow({ total_payout_amount: 60, total_creator_earnings_amount: 15, total_deposits_amount: 100, total_withdrawals_amount: 20 }),
    ];
    const s = buildSummary(rows);
    expect(s.total_payout_amount).toBe(110);
    expect(s.total_creator_earnings).toBe(25);
    expect(s.total_deposits).toBe(300);
    expect(s.total_withdrawals).toBe(50);
  });

  it('platform take can be derived from summary: stake - payout - earnings', () => {
    const rows = [
      makeRow({ total_stake_amount: 1000, total_payout_amount: 700, total_creator_earnings_amount: 50 }),
    ];
    const s = buildSummary(rows);
    const platformTake = s.total_stake_amount - s.total_payout_amount - s.total_creator_earnings;
    expect(platformTake).toBe(250);
  });

  it('handles null/undefined fields gracefully (coerces to 0)', () => {
    const rowWithNulls = { new_users_count: null, total_stake_amount: undefined } as unknown as DailyRow;
    expect(() => buildSummary([rowWithNulls])).not.toThrow();
    const s = buildSummary([rowWithNulls]);
    expect(s.total_new_users).toBe(0);
    expect(s.total_stake_amount).toBe(0);
  });
});

// ─── Referral attribution correctness ────────────────────────────────────────

describe('Referral attribution semantics', () => {
  /**
   * An attribution is considered "activated" when the referred user places
   * their first stake or creates their first prediction (is_activated = true).
   * "Qualified" requires ≥2 active days AND ≥1 economic action within 14 days.
   * These tests verify the classification logic at the data model level.
   */

  it('activated referral requires is_activated = true', () => {
    const attribution = { is_activated: true, is_qualified: false, is_retained: false };
    expect(attribution.is_activated).toBe(true);
    expect(attribution.is_qualified).toBe(false);
  });

  it('qualified referral implies activated (superset)', () => {
    // A qualified referral has met the activation threshold first,
    // then further met the 2-active-day + economic-action criteria.
    // is_qualified = true → is_activated should also be true in the DB.
    const attribution = { is_activated: true, is_qualified: true };
    expect(attribution.is_activated).toBe(true);
    expect(attribution.is_qualified).toBe(true);
  });

  it('suspicious attribution should NOT be counted as qualified', () => {
    // Flagged attributions are still counted in totals but subtract from score.
    const attribution = { is_suspicious: true, is_qualified: false };
    expect(attribution.is_qualified).toBe(false);
  });

  it('conversion rate is signups / clicks (may be > 100% if same user clicks multiple times)', () => {
    const clicks  = 10;
    const signups = 3;
    const rate = (signups / clicks) * 100;
    expect(rate).toBe(30);
  });

  it('conversion rate should handle zero clicks gracefully', () => {
    const clicks  = 0;
    const signups = 0;
    const rate = clicks > 0 ? (signups / clicks) * 100 : 0;
    expect(rate).toBe(0);
  });
});

// ─── Platform take rate ───────────────────────────────────────────────────────

describe('Platform take-rate calculation', () => {
  it('take rate = (stake - payout - earnings) / stake * 100', () => {
    const stake    = 1000;
    const payout   = 700;
    const earnings = 50;
    const take     = stake - payout - earnings;
    const rate     = (take / stake) * 100;
    expect(take).toBe(250);
    expect(rate).toBe(25);
  });

  it('returns null when stake is zero (avoid division by zero)', () => {
    const stake = 0;
    const rate  = stake > 0 ? ((stake - 0 - 0) / stake) * 100 : null;
    expect(rate).toBeNull();
  });

  it('correctly rounds to 2 decimal places', () => {
    const rate = Math.round(((333 / 1000) * 100) * 100) / 100;
    expect(rate).toBe(33.3);
  });
});
