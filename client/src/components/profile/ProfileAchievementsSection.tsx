import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Award, Crown, MessageCircle, Target, TrendingUp, Trophy, Users, X, Sparkles, Layers, ChevronRight } from 'lucide-react';
import type { AchievementAward, AchievementBadge } from '@/hooks/useUserAchievements';
import { formatTimeAgo } from '@/lib/format';

type DetailItem =
  | ({ kind: 'award' } & AchievementAward)
  | ({ kind: 'badge' } & AchievementBadge);

function iconForKey(iconKey?: string | null) {
  switch (iconKey) {
    case 'creator':
      return Crown;
    case 'trophy':
      return Trophy;
    case 'trending_up':
      return TrendingUp;
    case 'message_circle':
      return MessageCircle;
    case 'users':
      return Users;
    case 'target':
      return Target;
    case 'layers':
      return Layers;
    case 'sparkles':
      return Sparkles;
    default:
      return Award;
  }
}

function formatScore(score: number) {
  if (!Number.isFinite(score)) return '0';
  if (Math.abs(score) >= 1000) return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(score);
  return Number.isInteger(score) ? String(score) : score.toFixed(2);
}

function windowLabel(window: AchievementAward['window']) {
  if (window === '7d') return 'This Week';
  if (window === '30d') return 'This Month';
  return 'All Time';
}

function windowShortLabel(window: AchievementAward['window']) {
  if (window === '7d') return 'Week';
  if (window === '30d') return 'Month';
  return 'All Time';
}

function scoreLabel(metric?: string) {
  switch (metric) {
    case 'creator_earnings_amount':
      return 'Creator earnings';
    case 'payouts_amount':
      return 'Total payouts';
    case 'net_profit':
      return 'Net profit';
    case 'comments_count':
      return 'Comments posted';
    case 'markets_participated_count':
      return 'Markets participated';
    case 'stakes_count':
      return 'Stake actions';
    default:
      return 'Score';
  }
}

function badgeHowToEarn(badgeKey: string) {
  switch (badgeKey) {
    case 'FIRST_STAKE':
      return 'Place your first stake on any open market.';
    case 'TEN_STAKES':
      return 'Place 10 stakes across any markets over time.';
    case 'FIRST_COMMENT':
      return 'Post your first comment on a market.';
    case 'FIRST_CREATOR_EARNING':
      return 'Earn creator fees from a market you created.';
    default:
      return 'Complete the activity described above.';
  }
}

interface Props {
  awards: AchievementAward[];
  badges: AchievementBadge[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

const MAX_VISIBLE_AWARDS_PER_WINDOW = 3;

export const ProfileAchievementsSection: React.FC<Props> = ({
  awards,
  badges,
  loading = false,
  error = null,
  onRetry,
}) => {
  const [detail, setDetail] = React.useState<DetailItem | null>(null);
  const [expandedWindows, setExpandedWindows] = React.useState<Record<'7d' | '30d' | 'all', boolean>>({
    '7d': false,
    '30d': false,
    all: false,
  });

  const groupedAwards = React.useMemo(() => {
    return {
      '7d': awards.filter(a => a.window === '7d'),
      '30d': awards.filter(a => a.window === '30d'),
      all: awards.filter(a => a.window === 'all'),
    } as const;
  }, [awards]);

  const hasAny = awards.length > 0 || badges.length > 0;

  return (
    <>
      <div className="bg-white rounded-2xl border border-black/[0.06] p-4">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Achievements</h3>
          <p className="text-xs text-gray-500 mt-1">
            Awards rotate by time window. Badges are earned once and kept forever.
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-black/[0.06] p-3 space-y-2">
              <div className="h-3 w-24 rounded bg-gray-100 animate-pulse" />
              <div className="flex gap-2 flex-wrap">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-8 w-28 rounded-full bg-gray-100 animate-pulse" />
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-black/[0.06] p-3 space-y-2">
              <div className="h-3 w-20 rounded bg-gray-100 animate-pulse" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-xl bg-gray-100 animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-black/[0.06] bg-gray-50 px-3 py-3">
            <p className="text-xs text-gray-700">{error}</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-2 inline-flex items-center rounded-lg border border-black/[0.08] bg-white px-3 py-1.5 text-xs font-medium text-gray-900 hover:bg-gray-50"
              >
                Retry
              </button>
            )}
          </div>
        ) : !hasAny ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-900">No achievements yet.</p>
            <p className="text-xs text-gray-500 mt-1">Earn titles by participating and creating. Badges unlock as you complete milestones.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <section className="rounded-xl border border-black/[0.06] p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-900">Awards (Titles)</h4>
                <span className="text-[11px] text-gray-500">Rotates daily</span>
              </div>
              <p className="text-xs text-gray-500 mb-3">Top rankings across weekly, monthly, and all-time windows.</p>
              <div className="space-y-3">
                {(['7d', '30d', 'all'] as const).map((window) => {
                  const items = groupedAwards[window];
                  const isExpanded = expandedWindows[window];
                  const visibleItems = isExpanded ? items : items.slice(0, MAX_VISIBLE_AWARDS_PER_WINDOW);
                  return (
                    <div key={window} className="border-t border-gray-100 first:border-t-0 first:pt-0 pt-3">
                      <div className="text-[11px] font-medium text-gray-500 mb-2">{windowLabel(window)}</div>
                      {items.length === 0 ? (
                        <div className="text-xs text-gray-400 px-1 py-1">No titles yet.</div>
                      ) : (
                        <>
                          <div className="flex flex-wrap gap-2">
                            {visibleItems.map((award) => {
                            const Icon = iconForKey(award.iconKey);
                            return (
                              <button
                                key={`${award.awardKey}-${award.window}`}
                                onClick={() => setDetail({ ...award, kind: 'award' })}
                                aria-label={`${award.title}, rank ${award.rank}, ${windowShortLabel(award.window)}. ${award.description}`}
                                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-3 py-1.5 text-xs font-medium text-gray-900 hover:bg-gray-50 transition-colors"
                              >
                                <Icon className="w-3.5 h-3.5 text-gray-500" aria-hidden="true" />
                                <span>{award.title} #{award.rank} · {windowShortLabel(award.window)}</span>
                              </button>
                            );
                            })}
                          </div>
                          {items.length > MAX_VISIBLE_AWARDS_PER_WINDOW && (
                            <button
                              type="button"
                              onClick={() => setExpandedWindows(prev => ({ ...prev, [window]: !prev[window] }))}
                              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-gray-700 hover:text-gray-900"
                            >
                              <span>{isExpanded ? 'Show less' : `View all (${items.length})`}</span>
                              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-xl border border-black/[0.06] p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-900">Badges (Permanent)</h4>
                <span className="text-[11px] text-gray-500">Kept forever</span>
              </div>
              <p className="text-xs text-gray-500 mb-3">Milestones you earn once and keep on your profile.</p>
              {badges.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2">
                  <p className="text-sm text-gray-700">No badges yet.</p>
                  <p className="text-xs text-gray-500 mt-1">Start with your first stake or comment to unlock a badge.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {badges.map((badge) => {
                    const Icon = iconForKey(badge.iconKey);
                    return (
                      <button
                        key={badge.badgeKey}
                        onClick={() => setDetail({ ...badge, kind: 'badge' })}
                        aria-label={`${badge.title}. ${badge.description}. ${badge.earnedAt ? `Earned ${formatTimeAgo(badge.earnedAt)}.` : ''}`}
                        className="text-left rounded-xl border border-black/[0.06] bg-white hover:bg-gray-50 px-3 py-2 transition-colors min-h-[56px]"
                      >
                        <div className="flex items-start gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gray-50 border border-black/[0.06] flex items-center justify-center flex-shrink-0">
                            <Icon className="w-4 h-4 text-gray-700" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{badge.title}</div>
                            <div className="text-[11px] text-gray-500">Earned {badge.earnedAt ? formatTimeAgo(badge.earnedAt) : 'recently'}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      <Dialog.Root open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[12000]" />
          {detail && (
            <Dialog.Content
              className="fixed left-0 right-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] md:left-1/2 md:right-auto md:top-1/2 md:bottom-auto md:-translate-x-1/2 md:-translate-y-1/2 bg-white rounded-t-2xl md:rounded-2xl shadow-2xl z-[12001] max-h-[calc(100vh-4rem-env(safe-area-inset-bottom))] md:max-h-[80vh] overflow-y-auto w-full md:max-w-md border border-black/[0.06]"
            >
              <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3 flex items-center justify-between">
                <div className="min-w-0">
                  <Dialog.Title className="text-sm font-semibold text-gray-900 truncate">{detail.title}</Dialog.Title>
                  <Dialog.Description className="text-xs text-gray-500">
                    {detail.kind === 'award' ? 'Award (rotating title)' : 'Badge (permanent achievement)'}
                  </Dialog.Description>
                </div>
                <Dialog.Close className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="Close achievement details">
                  <X className="w-4 h-4 text-gray-500" />
                </Dialog.Close>
              </div>

              <div className="p-4 space-y-4">
                <p className="text-sm text-gray-700">{detail.description}</p>

                {detail.kind === 'award' ? (
                  <>
                    <div className="rounded-xl border border-black/[0.06] divide-y divide-gray-100">
                      <div className="flex items-center justify-between px-3 py-2 text-sm">
                        <span className="text-gray-500">Window</span>
                        <span className="font-medium text-gray-900">{windowLabel(detail.window)}</span>
                      </div>
                      <div className="flex items-center justify-between px-3 py-2 text-sm">
                        <span className="text-gray-500">Rank</span>
                        <span className="font-medium text-gray-900">#{detail.rank}</span>
                      </div>
                      <div className="flex items-center justify-between px-3 py-2 text-sm">
                        <span className="text-gray-500">{scoreLabel(detail.metric)}</span>
                        <span className="font-medium text-gray-900">{formatScore(detail.score)}</span>
                      </div>
                    </div>
                    <div className="rounded-xl bg-gray-50 border border-black/[0.04] px-3 py-2 text-xs text-gray-600 space-y-1">
                      <p>Awards update daily.</p>
                      <p>{detail.computedAt ? `Last updated ${formatTimeAgo(detail.computedAt)}.` : 'Computed from cached daily stats.'}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-xl border border-black/[0.06] divide-y divide-gray-100">
                      <div className="flex items-center justify-between px-3 py-2 text-sm">
                        <span className="text-gray-500">Earned</span>
                        <span className="font-medium text-gray-900">{detail.earnedAt ? formatTimeAgo(detail.earnedAt) : 'Recently'}</span>
                      </div>
                    </div>
                    <div className="rounded-xl bg-gray-50 border border-black/[0.04] px-3 py-2 text-xs text-gray-600 space-y-1">
                      <p>Badges are permanent and stay on your profile once earned.</p>
                      <p>How to earn: {badgeHowToEarn(detail.badgeKey)}</p>
                    </div>
                  </>
                )}
              </div>
            </Dialog.Content>
          )}
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
};
