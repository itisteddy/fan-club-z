/**
 * useAdminFilter — shared URL-driven filter state for admin analytics pages.
 *
 * WHY THIS EXISTS
 * ───────────────
 * React Router v6's `setSearchParams(prev => next)` passes the *same* `prev`
 * snapshot to every synchronous call in one event handler — the last call wins.
 * Calling `setParam('period', p)` then `setParam('dateFrom', '')` then
 * `setParam('dateTo', '')` as three separate setSearchParams invocations means
 * the period change is silently discarded.
 *
 * This hook exposes atomic helpers that apply all related mutations in a single
 * `setSearchParams` call so every parameter change is preserved.
 */

import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export type AdminPeriod = '7d' | '30d' | '90d' | 'all';

export const ADMIN_PERIOD_LABELS: Record<AdminPeriod, string> = {
  '7d':  'Last 7d',
  '30d': 'Last 30d',
  '90d': 'Last 90d',
  'all': 'All time',
};

export const ADMIN_PERIODS = ['7d', '30d', '90d', 'all'] as const;

export interface AdminFilterState {
  period:   AdminPeriod;
  dateFrom: string;
  dateTo:   string;
}

export interface UseAdminFilterReturn {
  /** Current filter state (derived from URL). */
  filter: AdminFilterState;
  /**
   * Atomically set the rolling period and clear any custom date range.
   * This is the correct way to handle period-pill clicks.
   */
  setPeriod: (p: AdminPeriod) => void;
  /**
   * Atomically set a custom date range and clear the period pill selection.
   * Pass empty strings to clear individual fields.
   */
  setDateRange: (from: string, to: string) => void;
  /** Clear the custom date range without touching the period. */
  clearDateRange: () => void;
  /**
   * Generic single-param setter — safe for isolated params like `sort`, `page`,
   * `tab`, `search` etc. that don't interact with period/date.
   * An empty `value` removes the param.
   */
  setParam: (key: string, value: string) => void;
  /**
   * Delete a param from the URL.
   */
  deleteParam: (key: string) => void;
}

export function useAdminFilter(): UseAdminFilterReturn {
  const [searchParams, setSearchParams] = useSearchParams();

  const period   = (searchParams.get('period')   as AdminPeriod) || '30d';
  const dateFrom = searchParams.get('dateFrom') || '';
  const dateTo   = searchParams.get('dateTo')   || '';

  const filter: AdminFilterState = { period, dateFrom, dateTo };

  // Atomically set period and wipe any custom date range.
  const setPeriod = useCallback((p: AdminPeriod) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('period', p);
      next.delete('dateFrom');
      next.delete('dateTo');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Atomically set both date range endpoints.
  const setDateRange = useCallback((from: string, to: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (from) next.set('dateFrom', from); else next.delete('dateFrom');
      if (to)   next.set('dateTo',   to);   else next.delete('dateTo');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Atomically wipe both date range fields.
  const clearDateRange = useCallback(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('dateFrom');
      next.delete('dateTo');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Generic single-param setter (use for non-interacting params).
  const setParam = useCallback((key: string, value: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value); else next.delete(key);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const deleteParam = useCallback((key: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete(key);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  return { filter, setPeriod, setDateRange, clearDateRange, setParam, deleteParam };
}
