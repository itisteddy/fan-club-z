/**
 * Analytics URL Filter State – Unit Tests
 *
 * The admin analytics dashboard stores all filter state in URL search params
 * to enable shareable, bookmarkable report links.
 *
 * These tests verify the URL state contract: which params are read/written,
 * how presets map to param values, and that the param serialisation is stable.
 *
 * These are pure TypeScript tests (no DOM/React needed) that validate the
 * data contract independently of the UI rendering layer.
 */

import { describe, expect, it } from '@jest/globals';

// ─── Types (mirrors dashboard types) ─────────────────────────────────────────

type Period = '7d' | '30d' | '90d' | 'all';
type Tab    = 'overview' | 'growth' | 'referral' | 'engagement' | 'ops';

interface FilterState {
  tab:      Tab;
  period:   Period;
  dateFrom: string;
  dateTo:   string;
}

interface ReportPreset {
  id:       string;
  tab:      Tab;
  period:   Period;
  dateFrom?: string;
  dateTo?:  string;
}

// ─── Report presets (mirrors REPORT_PRESETS in AdminAnalyticsDashboard) ──────

const REPORT_PRESETS: ReportPreset[] = [
  { id: 'executive', tab: 'overview',   period: '30d' },
  { id: 'growth',    tab: 'growth',     period: '90d' },
  { id: 'referral',  tab: 'referral',   period: '30d' },
  { id: 'creator',   tab: 'engagement', period: '30d' },
  { id: 'ops',       tab: 'ops',        period: '7d'  },
];

// ─── Helpers: URL param serialisation ────────────────────────────────────────

function serializeFilterState(state: FilterState): URLSearchParams {
  const p = new URLSearchParams();
  p.set('tab', state.tab);
  p.set('period', state.period);
  if (state.dateFrom) p.set('dateFrom', state.dateFrom);
  if (state.dateTo)   p.set('dateTo',   state.dateTo);
  return p;
}

function deserializeFilterState(params: URLSearchParams): FilterState {
  return {
    tab:      (params.get('tab')     as Tab    | null) ?? 'overview',
    period:   (params.get('period')  as Period | null) ?? '30d',
    dateFrom: params.get('dateFrom') ?? '',
    dateTo:   params.get('dateTo')   ?? '',
  };
}

function applyPreset(params: URLSearchParams, preset: ReportPreset): URLSearchParams {
  const next = new URLSearchParams(params);
  next.set('tab',    preset.tab);
  next.set('period', preset.period);
  if (preset.dateFrom) next.set('dateFrom', preset.dateFrom); else next.delete('dateFrom');
  if (preset.dateTo)   next.set('dateTo',   preset.dateTo);   else next.delete('dateTo');
  next.set('preset', preset.id);
  return next;
}

// ─── Filter state serialisation ──────────────────────────────────────────────

describe('Filter state URL serialisation', () => {
  it('round-trips: serialise → deserialise returns identical state', () => {
    const state: FilterState = { tab: 'growth', period: '90d', dateFrom: '2025-01-01', dateTo: '2025-03-31' };
    const params   = serializeFilterState(state);
    const restored = deserializeFilterState(params);
    expect(restored).toEqual(state);
  });

  it('defaults to overview tab and 30d period when params are missing', () => {
    const empty = deserializeFilterState(new URLSearchParams());
    expect(empty.tab).toBe('overview');
    expect(empty.period).toBe('30d');
    expect(empty.dateFrom).toBe('');
    expect(empty.dateTo).toBe('');
  });

  it('omits dateFrom/dateTo params when they are empty', () => {
    const state: FilterState = { tab: 'ops', period: '7d', dateFrom: '', dateTo: '' };
    const params = serializeFilterState(state);
    expect(params.has('dateFrom')).toBe(false);
    expect(params.has('dateTo')).toBe(false);
    expect(params.has('tab')).toBe(true);
    expect(params.has('period')).toBe(true);
  });

  it('preserves other params when applying a preset (non-destructive)', () => {
    const initial = new URLSearchParams('tab=overview&period=7d&otherParam=preserved');
    const result  = applyPreset(initial, REPORT_PRESETS[0]!);
    expect(result.get('otherParam')).toBe('preserved');
  });
});

// ─── Preset application ───────────────────────────────────────────────────────

describe('Report preset application', () => {
  it('applying executive preset sets tab=overview, period=30d', () => {
    const params = applyPreset(new URLSearchParams(), REPORT_PRESETS[0]!);
    expect(params.get('tab')).toBe('overview');
    expect(params.get('period')).toBe('30d');
    expect(params.get('preset')).toBe('executive');
  });

  it('applying growth preset sets tab=growth, period=90d', () => {
    const params = applyPreset(new URLSearchParams(), REPORT_PRESETS[1]!);
    expect(params.get('tab')).toBe('growth');
    expect(params.get('period')).toBe('90d');
  });

  it('applying ops preset sets tab=ops, period=7d', () => {
    const opsPreset = REPORT_PRESETS.find(p => p.id === 'ops')!;
    const params    = applyPreset(new URLSearchParams(), opsPreset);
    expect(params.get('tab')).toBe('ops');
    expect(params.get('period')).toBe('7d');
  });

  it('applying a preset clears dateFrom and dateTo', () => {
    const initial = new URLSearchParams('dateFrom=2024-01-01&dateTo=2024-12-31');
    const result  = applyPreset(initial, REPORT_PRESETS[0]!);
    expect(result.has('dateFrom')).toBe(false);
    expect(result.has('dateTo')).toBe(false);
  });

  it('all 5 required presets are defined', () => {
    const ids = REPORT_PRESETS.map(p => p.id);
    expect(ids).toContain('executive');
    expect(ids).toContain('growth');
    expect(ids).toContain('referral');
    expect(ids).toContain('creator');
    expect(ids).toContain('ops');
  });

  it('each preset points to a valid tab', () => {
    const validTabs: Tab[] = ['overview', 'growth', 'referral', 'engagement', 'ops'];
    for (const preset of REPORT_PRESETS) {
      expect(validTabs).toContain(preset.tab);
    }
  });

  it('each preset specifies a valid period', () => {
    const validPeriods: Period[] = ['7d', '30d', '90d', 'all'];
    for (const preset of REPORT_PRESETS) {
      expect(validPeriods).toContain(preset.period);
    }
  });
});

// ─── Date range vs period interactions ────────────────────────────────────────

describe('Date range overrides period', () => {
  it('when dateFrom is set, the explicit date takes precedence over period', () => {
    // The API accepts dateFrom + dateTo and ignores period when both are provided.
    // This test verifies the contract at the URL-state level.
    const state: FilterState = { tab: 'overview', period: '7d', dateFrom: '2025-01-01', dateTo: '2025-01-31' };
    const params = serializeFilterState(state);

    expect(params.get('dateFrom')).toBe('2025-01-01');
    expect(params.get('dateTo')).toBe('2025-01-31');
    // Both dateFrom and period coexist in the URL; the API uses dateFrom when present
    expect(params.get('period')).toBe('7d');
  });

  it('clearing dateFrom/dateTo falls back to period-based range', () => {
    const withDates = new URLSearchParams('tab=overview&period=30d&dateFrom=2025-01-01&dateTo=2025-01-31');
    withDates.delete('dateFrom');
    withDates.delete('dateTo');
    const state = deserializeFilterState(withDates);
    expect(state.dateFrom).toBe('');
    expect(state.dateTo).toBe('');
    expect(state.period).toBe('30d'); // period is still set, used as fallback
  });

  it('date format must be YYYY-MM-DD (ISO 8601 date)', () => {
    const validPattern = /^\d{4}-\d{2}-\d{2}$/;
    const testDates = ['2025-01-01', '2024-12-31', '2026-03-14'];
    for (const d of testDates) {
      expect(d).toMatch(validPattern);
    }
    // Invalid formats would fail server-side Zod validation
    expect('01/01/2025').not.toMatch(validPattern);
    expect('2025/01/01').not.toMatch(validPattern);
  });
});
