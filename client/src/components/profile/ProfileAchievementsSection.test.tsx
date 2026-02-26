// @ts-nocheck
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProfileAchievementsSection } from './ProfileAchievementsSection';

vi.mock('@/lib/format', () => ({
  formatTimeAgo: () => '2d ago',
}));

describe('ProfileAchievementsSection', () => {
  it('renders compact awards by window and opens details sheet', async () => {
    render(
      <ProfileAchievementsSection
        awards={[
          { awardKey: 'A1', title: 'Top Creator', description: 'Desc', iconKey: 'creator', metric: 'creator_earnings_amount', window: '7d', rank: 1, score: 10, computedAt: 'x' },
          { awardKey: 'A2', title: 'Top Winners', description: 'Desc', iconKey: 'trophy', metric: 'payouts_amount', window: '7d', rank: 2, score: 9, computedAt: 'x' },
          { awardKey: 'A3', title: 'Top Profiters', description: 'Desc', iconKey: 'trending_up', metric: 'net_profit', window: '7d', rank: 3, score: 8, computedAt: 'x' },
          { awardKey: 'A4', title: 'Top Commenter', description: 'Desc', iconKey: 'message_circle', metric: 'comments_count', window: '7d', rank: 4, score: 7, computedAt: 'x' },
          { awardKey: 'A5', title: 'Top Participants', description: 'Desc', iconKey: 'users', metric: 'stakes_count', window: '30d', rank: 1, score: 99, computedAt: 'x' },
        ]}
        badges={[
          { badgeKey: 'FIRST_STAKE', title: 'First Stake', description: 'Placed your first stake.', iconKey: 'target', earnedAt: 'x', metadata: {} },
        ]}
      />
    );

    expect(screen.getByText('Achievements')).toBeInTheDocument();
    expect(screen.getByText('Awards (Titles)')).toBeInTheDocument();
    expect(screen.getByText('Badges (Permanent)')).toBeInTheDocument();

    // 7d has 4 awards; compact view shows 3 and view-all control.
    expect(screen.getByRole('button', { name: /view all \(4\)/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /top creator #1 · week/i }));
    expect(await screen.findByText('Awards update daily.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /close achievement details/i }));
  });

  it('renders empty and error states with retry', () => {
    const onRetry = vi.fn();
    const { rerender } = render(
      <ProfileAchievementsSection awards={[]} badges={[]} error="Failed to load achievements" onRetry={onRetry} />
    );

    expect(screen.getByText('Failed to load achievements')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    rerender(<ProfileAchievementsSection awards={[]} badges={[]} />);
    expect(screen.getByText('No achievements yet.')).toBeInTheDocument();
    expect(screen.getByText(/Earn titles by participating and creating/i)).toBeInTheDocument();
  });
});

