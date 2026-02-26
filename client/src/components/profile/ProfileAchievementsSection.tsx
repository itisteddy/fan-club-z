import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  Award,
  HelpCircle,
  Crown,
  Layers,
  Lock,
  MessageCircle,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import type {
  AchievementAward,
  AchievementAwardDefinition,
  AchievementBadgeDefinition,
  AchievementBadge,
} from '@/hooks/useUserAchievements';
import { formatTimeAgo } from '@/lib/format';

type TitleTile = {
  type: 'title';
  definition: AchievementAwardDefinition;
  activeAward: AchievementAward | null;
};

type BadgeTile = {
  type: 'badge';
  definition: AchievementBadgeDefinition;
  earned: AchievementBadge | null;
};

type DetailItem = TitleTile | BadgeTile;

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

function shortAwardTitle(title: string) {
  return title
    .replace(/^Top\s+/i, '')
    .replace(/^10\s+/, '10 ');
}

function windowTag(window?: AchievementAward['window'] | null) {
  if (window === '7d') return 'Week';
  if (window === '30d') return 'Month';
  if (window === 'all') return 'All';
  return '';
}

function windowLabel(window?: AchievementAward['window'] | null) {
  if (window === '7d') return 'This Week';
  if (window === '30d') return 'This Month';
  if (window === 'all') return 'All Time';
  return 'Not ranked';
}

function formatScore(score: number) {
  if (!Number.isFinite(score)) return '0';
  if (Math.abs(score) >= 1000) {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(score);
  }
  return Number.isInteger(score) ? String(score) : score.toFixed(2);
}

function metricLabel(metric?: string) {
  switch (metric) {
    case 'creator_earnings_amount':
      return 'Creator earnings';
    case 'payouts_amount':
      return 'Payout total';
    case 'net_profit':
      return 'Net profit';
    case 'comments_count':
      return 'Comments';
    case 'markets_participated_count':
      return 'Markets participated';
    case 'stakes_count':
      return 'Stake actions';
    default:
      return 'Score';
  }
}

function badgeHowToEarnBullets(badgeKey: string): string[] {
  switch (badgeKey) {
    case 'FIRST_STAKE':
      return ['Place a stake on any open market.', 'Confirm the stake successfully.'];
    case 'TEN_STAKES':
      return ['Place at least 10 stake actions.', 'Stakes can be across different markets.'];
    case 'FIRST_COMMENT':
      return ['Post 100 comments on markets.', 'Comments must be successfully submitted.'];
    case 'FIRST_CREATOR_EARNING':
      return ['Accumulate 10 creator earnings credits.', 'Creator fees must be credited to your creator earnings balance.'];
    default:
      return ['Complete the achievement activity shown above.'];
  }
}

interface Props {
  awardDefinitions?: AchievementAwardDefinition[];
  awards: AchievementAward[];
  badgeDefinitions?: AchievementBadgeDefinition[];
  badgesEarned?: AchievementBadge[];
  badges?: AchievementBadge[]; // back-compat
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export const ProfileAchievementsSection: React.FC<Props> = ({
  awardDefinitions = [],
  awards,
  badgeDefinitions = [],
  badgesEarned,
  badges = [],
  loading = false,
  error = null,
  onRetry,
}) => {
  const [detail, setDetail] = React.useState<DetailItem | null>(null);
  const [showInfo, setShowInfo] = React.useState(false);

  const earnedBadges = badgesEarned && badgesEarned.length ? badgesEarned : badges;
  const earnedBadgeMap = React.useMemo(
    () => new Map(earnedBadges.map((b) => [b.badgeKey, b])),
    [earnedBadges]
  );

  const bestAwardByKey = React.useMemo(() => {
    const priority: Record<AchievementAward['window'], number> = { '7d': 0, '30d': 1, all: 2 };
    const map = new Map<string, AchievementAward>();
    for (const award of awards) {
      const current = map.get(award.awardKey);
      if (!current) {
        map.set(award.awardKey, award);
        continue;
      }
      const pDiff = (priority[award.window] ?? 99) - (priority[current.window] ?? 99);
      if (pDiff < 0 || (pDiff === 0 && award.rank < current.rank)) {
        map.set(award.awardKey, award);
      }
    }
    return map;
  }, [awards]);

  const titleTiles = React.useMemo(() => {
    return awardDefinitions.map((def) => ({
      type: 'title' as const,
      definition: def,
      activeAward: bestAwardByKey.get(def.key) || null,
    }));
  }, [awardDefinitions, bestAwardByKey]);

  const badgeTiles = React.useMemo(() => {
    return badgeDefinitions
      .filter((def) => def.isKey !== false)
      .map((def) => ({
        type: 'badge' as const,
        definition: def,
        earned: earnedBadgeMap.get(def.key) || null,
      }));
  }, [badgeDefinitions, earnedBadgeMap]);

  const hasDefinitions = titleTiles.length > 0 || badgeTiles.length > 0;

  return (
    <>
      <div className="bg-white rounded-2xl border border-black/[0.06] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Achievements</h3>
          <button
            type="button"
            onClick={() => setShowInfo(true)}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-black/[0.06] text-gray-500 hover:bg-gray-50"
            aria-label="Achievements info"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-black/[0.06] p-3">
              <div className="h-3 w-14 rounded bg-gray-100 animate-pulse mb-3" />
              <div className="flex gap-2 overflow-hidden">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-20 min-w-[92px] rounded-xl bg-gray-100 animate-pulse" />
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-black/[0.06] p-3">
              <div className="h-3 w-16 rounded bg-gray-100 animate-pulse mb-3" />
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />
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
        ) : !hasDefinitions ? (
          <div className="rounded-xl border border-black/[0.06] bg-gray-50 p-3">
            <p className="text-xs text-gray-600">Achievements will appear after setup completes.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <section className="rounded-xl border border-black/[0.06] p-3">
              <div className="text-xs font-medium text-gray-700 mb-2">Titles</div>
              <div
                className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
              >
                {titleTiles.map((tile) => {
                  const Icon = iconForKey(tile.definition.iconKey);
                  const active = tile.activeAward;
                  return (
                    <button
                      key={tile.definition.key}
                      type="button"
                      onClick={() => setDetail(tile)}
                      className={[
                        'min-w-[94px] w-[94px] rounded-xl border px-2 py-2 text-left transition-colors',
                        active
                          ? 'bg-white border-black/[0.08] hover:bg-gray-50'
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100',
                      ].join(' ')}
                      aria-label={
                        active
                          ? `${tile.definition.title}, rank ${active.rank}, ${windowLabel(active.window)}`
                          : `${tile.definition.title}, not ranked currently`
                      }
                    >
                      <div
                        className={[
                          'w-7 h-7 rounded-lg border flex items-center justify-center mb-2',
                          active ? 'bg-white border-black/[0.06]' : 'bg-gray-100 border-gray-200',
                        ].join(' ')}
                      >
                        <Icon className={['w-4 h-4', active ? 'text-gray-800' : 'text-gray-400'].join(' ')} />
                      </div>
                      <div className={['text-[11px] font-medium leading-tight truncate', active ? 'text-gray-900' : 'text-gray-500'].join(' ')}>
                        {shortAwardTitle(tile.definition.title)}
                      </div>
                      {active ? (
                        <div className="mt-1">
                          <div className="text-xs font-semibold text-gray-900">#{active.rank}</div>
                          <div className="inline-flex mt-1 rounded-full border border-black/[0.06] px-1.5 py-0.5 text-[10px] text-gray-600 bg-gray-50">
                            {windowTag(active.window)}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1 text-[10px] text-gray-400">Not ranked</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-xl border border-black/[0.06] p-3">
              <div className="text-xs font-medium text-gray-700 mb-2">Badges</div>
              <div className="grid grid-cols-3 gap-2">
                {badgeTiles.map((tile) => {
                  const Icon = iconForKey(tile.definition.iconKey);
                  const earned = Boolean(tile.earned);
                  const progressLabel = tile.definition.progressLabel;
                  const progressPct = typeof tile.definition.progressPct === 'number' ? tile.definition.progressPct : 0;
                  return (
                    <button
                      key={tile.definition.key}
                      type="button"
                      onClick={() => setDetail(tile)}
                      className={[
                        'relative rounded-xl border p-2 text-center min-h-[86px] transition-colors',
                        earned
                          ? 'bg-white border-black/[0.08] hover:bg-gray-50'
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100',
                      ].join(' ')}
                      aria-label={`${tile.definition.title}. ${earned ? 'Earned.' : `Locked. Progress ${progressLabel || ''}`}`}
                    >
                      {!earned && (
                        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-white border border-gray-200 flex items-center justify-center">
                          <Lock className="w-2.5 h-2.5 text-gray-400" />
                        </div>
                      )}
                      <div
                        className={[
                          'mx-auto w-9 h-9 rounded-xl border flex items-center justify-center',
                          earned ? 'bg-white border-black/[0.06]' : 'bg-gray-100 border-gray-200',
                        ].join(' ')}
                      >
                        <Icon className={['w-4.5 h-4.5', earned ? 'text-gray-800' : 'text-gray-400'].join(' ')} />
                      </div>
                      <div className={['mt-2 text-[10px] leading-tight line-clamp-2', earned ? 'text-gray-700' : 'text-gray-500'].join(' ')}>
                        {tile.definition.title}
                      </div>
                      {!earned && progressLabel && (
                        <div className="mt-1 space-y-1">
                          <div className="text-[10px] text-gray-400">{progressLabel}</div>
                          <div className="h-1 w-full rounded-full bg-gray-200 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gray-400/70"
                              style={{ width: `${Math.max(0, Math.min(100, progressPct))}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </div>

      <Dialog.Root open={showInfo} onOpenChange={setShowInfo}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[12000]" />
          <Dialog.Content className="fixed left-0 right-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] md:left-1/2 md:right-auto md:top-1/2 md:bottom-auto md:-translate-x-1/2 md:-translate-y-1/2 bg-white rounded-t-2xl md:rounded-2xl shadow-2xl z-[12001] w-full md:max-w-md border border-black/[0.06]">
            <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3 flex items-center justify-between">
              <Dialog.Title className="text-sm font-semibold text-gray-900">Achievements</Dialog.Title>
              <Dialog.Close className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="Close achievements info">
                <X className="w-4 h-4 text-gray-500" />
              </Dialog.Close>
            </div>
            <div className="p-4 space-y-2 text-sm text-gray-700">
              <p>Titles refresh daily and show rankings you currently hold.</p>
              <p>Badges are permanent once earned.</p>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[12000]" />
          {detail && (
            <Dialog.Content className="fixed left-0 right-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] md:left-1/2 md:right-auto md:top-1/2 md:bottom-auto md:-translate-x-1/2 md:-translate-y-1/2 bg-white rounded-t-2xl md:rounded-2xl shadow-2xl z-[12001] max-h-[calc(100vh-4rem-env(safe-area-inset-bottom))] md:max-h-[80vh] overflow-y-auto w-full md:max-w-md border border-black/[0.06]">
              <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3 flex items-center justify-between">
                <div className="min-w-0">
                  <Dialog.Title className="text-sm font-semibold text-gray-900 truncate">
                    {detail.definition.title}
                  </Dialog.Title>
                  <Dialog.Description className="text-xs text-gray-500">
                    {detail.type === 'title' ? 'Title (rotating award)' : 'Badge (permanent)'}
                  </Dialog.Description>
                </div>
                <Dialog.Close className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="Close achievement details">
                  <X className="w-4 h-4 text-gray-500" />
                </Dialog.Close>
              </div>

              <div className="p-4 space-y-4">
                <p className="text-sm text-gray-700">{detail.definition.description}</p>

                {detail.type === 'title' ? (
                  <>
                    <div className="rounded-xl border border-black/[0.06] divide-y divide-gray-100">
                      <div className="flex items-center justify-between px-3 py-2 text-sm">
                        <span className="text-gray-500">Status</span>
                        <span className={detail.activeAward ? 'font-medium text-gray-900' : 'text-gray-500'}>
                          {detail.activeAward ? 'Active' : 'Not ranked'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between px-3 py-2 text-sm">
                        <span className="text-gray-500">Window</span>
                        <span className="font-medium text-gray-900">
                          {windowLabel(detail.activeAward?.window ?? null)}
                        </span>
                      </div>
                      {detail.activeAward && (
                        <>
                          <div className="flex items-center justify-between px-3 py-2 text-sm">
                            <span className="text-gray-500">Rank</span>
                            <span className="font-medium text-gray-900">#{detail.activeAward.rank}</span>
                          </div>
                          <div className="flex items-center justify-between px-3 py-2 text-sm">
                            <span className="text-gray-500">{metricLabel(detail.activeAward.metric)}</span>
                            <span className="font-medium text-gray-900">{formatScore(detail.activeAward.score)}</span>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="rounded-xl bg-gray-50 border border-black/[0.04] px-3 py-2 text-xs text-gray-600">
                      Updates daily.
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-xl border border-black/[0.06] divide-y divide-gray-100">
                      <div className="flex items-center justify-between px-3 py-2 text-sm">
                        <span className="text-gray-500">Status</span>
                        <span className={detail.earned ? 'font-medium text-gray-900' : 'text-gray-500'}>
                          {detail.earned ? 'Earned' : 'Locked'}
                        </span>
                      </div>
                      {detail.earned && (
                        <div className="flex items-center justify-between px-3 py-2 text-sm">
                          <span className="text-gray-500">Earned</span>
                          <span className="font-medium text-gray-900">{formatTimeAgo(detail.earned.earnedAt)}</span>
                        </div>
                      )}
                      {detail.definition.progressLabel && (
                        <div className="px-3 py-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Progress</span>
                            <span className="font-medium text-gray-900">{detail.definition.progressLabel}</span>
                          </div>
                          {!detail.earned && (
                            <div className="mt-2 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gray-500/70"
                                style={{ width: `${Math.max(0, Math.min(100, detail.definition.progressPct ?? 0))}%` }}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="rounded-xl bg-gray-50 border border-black/[0.04] px-3 py-2 text-xs text-gray-600 space-y-1">
                      <p className="font-medium text-gray-700">How to earn</p>
                      <ul className="space-y-1">
                        {badgeHowToEarnBullets(detail.definition.key).slice(0, 2).map((line, idx) => (
                          <li key={idx}>• {line}</li>
                        ))}
                      </ul>
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

export default ProfileAchievementsSection;
