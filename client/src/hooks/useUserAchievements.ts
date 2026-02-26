import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

export type AchievementAward = {
  awardKey: string;
  title: string;
  description: string;
  iconKey?: string | null;
  metric?: string;
  window: '7d' | '30d' | 'all';
  rank: number;
  score: number;
  computedAt: string;
};

export type AchievementAwardDefinition = {
  key: string;
  title: string;
  description: string;
  iconKey?: string | null;
  metric?: string;
  metricLabel?: string;
  sortOrder?: number;
};

export type AchievementBadge = {
  badgeKey: string;
  title: string;
  description: string;
  iconKey?: string | null;
  earnedAt: string;
  metadata?: Record<string, unknown>;
};

export type AchievementBadgeDefinition = {
  key: string;
  title: string;
  description: string;
  iconKey?: string | null;
  sortOrder?: number;
  isKey?: boolean;
};

export type UserAchievementsPayload = {
  userId: string;
  awardDefinitions: AchievementAwardDefinition[];
  awards: AchievementAward[];
  badgeDefinitions: AchievementBadgeDefinition[];
  badgesEarned: AchievementBadge[];
  // Back-compat alias for older UI call sites
  badges: AchievementBadge[];
};

export function useUserAchievements(userId?: string | null, enabled = true) {
  return useQuery({
    queryKey: ['user-achievements', userId || 'none'],
    enabled: enabled && !!userId,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    queryFn: async (): Promise<UserAchievementsPayload> => {
      const res = await apiClient.get(`users/${encodeURIComponent(String(userId))}/achievements`);
      const data = res?.data || {};
      return {
        userId: String(data.userId || userId),
        awardDefinitions: Array.isArray(data.awardDefinitions) ? data.awardDefinitions.map((d: any) => ({
          key: String(d.key),
          title: String(d.title || d.key),
          description: String(d.description || ''),
          iconKey: d.iconKey ?? null,
          metric: d.metric ?? undefined,
          metricLabel: d.metricLabel ?? undefined,
          sortOrder: Number(d.sortOrder ?? 999),
        })) : [],
        awards: Array.isArray(data.awards) ? data.awards.map((a: any) => ({
          awardKey: String(a.awardKey),
          title: String(a.title || a.awardKey),
          description: String(a.description || ''),
          iconKey: a.iconKey ?? null,
          metric: a.metric ?? undefined,
          window: a.window,
          rank: Number(a.rank || 0),
          score: Number(a.score || 0),
          computedAt: String(a.computedAt || ''),
        })) : [],
        badgeDefinitions: Array.isArray(data.badgeDefinitions) ? data.badgeDefinitions.map((d: any) => ({
          key: String(d.key),
          title: String(d.title || d.key),
          description: String(d.description || ''),
          iconKey: d.iconKey ?? null,
          sortOrder: Number(d.sortOrder ?? 999),
          isKey: d.isKey == null ? true : Boolean(d.isKey),
        })) : [],
        badgesEarned: Array.isArray(data.badgesEarned) ? data.badgesEarned.map((b: any) => ({
          badgeKey: String(b.badgeKey),
          title: '',
          description: '',
          iconKey: null,
          earnedAt: String(b.earnedAt || ''),
          metadata: b.metadata || {},
        })) : (Array.isArray(data.badges) ? data.badges.map((b: any) => ({
          badgeKey: String(b.badgeKey),
          title: String(b.title || b.badgeKey),
          description: String(b.description || ''),
          iconKey: b.iconKey ?? null,
          earnedAt: String(b.earnedAt || ''),
          metadata: b.metadata || {},
        })) : []),
        badges: Array.isArray(data.badges) ? data.badges.map((b: any) => ({
          badgeKey: String(b.badgeKey),
          title: String(b.title || b.badgeKey),
          description: String(b.description || ''),
          iconKey: b.iconKey ?? null,
          earnedAt: String(b.earnedAt || ''),
          metadata: b.metadata || {},
        })) : [],
      };
    },
  });
}
