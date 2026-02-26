// @ts-nocheck
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProfileAchievementsSection } from './ProfileAchievementsSection';

vi.mock('@/lib/format', () => ({
  formatTimeAgo: () => '2d ago',
}));

describe('ProfileAchievementsSection', () => {
  it('renders visual titles + badges and opens details sheets', async () => {
    render(
      <ProfileAchievementsSection
        awardDefinitions={[
          { key: 'TOP_CREATOR', title: 'Top Creator', description: 'Desc', iconKey: 'creator', metric: 'creator_earnings_amount', sortOrder: 10 },
          { key: 'TOP_WINNERS', title: 'Top Winners', description: 'Desc', iconKey: 'trophy', metric: 'payouts_amount', sortOrder: 20 },
          { key: 'TOP_PROFITERS', title: 'Top Profiters', description: 'Desc', iconKey: 'trending_up', metric: 'net_profit', sortOrder: 30 },
          { key: 'TOP_COMMENTER', title: 'Top Commenter', description: 'Desc', iconKey: 'message_circle', metric: 'comments_count', sortOrder: 40 },
          { key: 'TOP_PARTICIPANTS', title: 'Top Participants', description: 'Desc', iconKey: 'users', metric: 'stakes_count', sortOrder: 50 },
        ]}
        awards={[
          { awardKey: 'TOP_CREATOR', title: 'Top Creator', description: 'Desc', iconKey: 'creator', metric: 'creator_earnings_amount', window: '7d', rank: 1, score: 10, computedAt: 'x' },
          { awardKey: 'TOP_PARTICIPANTS', title: 'Top Participants', description: 'Desc', iconKey: 'users', metric: 'stakes_count', window: '30d', rank: 1, score: 99, computedAt: 'x' },
        ]}
        badgeDefinitions={[
          { key: 'FIRST_STAKE', title: 'First Stake', description: 'Placed your first stake.', iconKey: 'target', sortOrder: 10, isKey: true },
          { key: 'TEN_STAKES', title: '10 Stakes', description: 'Placed 10 stakes.', iconKey: 'layers', sortOrder: 20, isKey: true },
          { key: 'FIRST_COMMENT', title: 'First Comment', description: 'Posted a comment.', iconKey: 'message_circle', sortOrder: 30, isKey: true },
        ]}
        badgesEarned={[
          { badgeKey: 'FIRST_STAKE', title: 'First Stake', description: 'Placed your first stake.', iconKey: 'target', earnedAt: 'x', metadata: {} },
        ]}
      />
    );

    expect(screen.getByText('Achievements')).toBeInTheDocument();
    expect(screen.getByText('Titles')).toBeInTheDocument();
    expect(screen.getByText('Badges')).toBeInTheDocument();
    expect(screen.getByText('Not ranked')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /top creator, rank 1, this week/i }));
    expect(await screen.findByText('Updates daily.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /close achievement details/i }));
  });

  it('renders loading/error and definition-backed locked states', () => {
    const onRetry = vi.fn();
    const { rerender } = render(
      <ProfileAchievementsSection awards={[]} badges={[]} error="Failed to load achievements" onRetry={onRetry} />
    );

    expect(screen.getByText('Failed to load achievements')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    rerender(
      <ProfileAchievementsSection
        awardDefinitions={[{ key: 'TOP_CREATOR', title: 'Top Creator', description: 'Desc', iconKey: 'creator', metric: 'creator_earnings_amount' }]}
        awards={[]}
        badgeDefinitions={[{ key: 'FIRST_STAKE', title: 'First Stake', description: 'Desc', iconKey: 'target', isKey: true }]}
        badgesEarned={[]}
      />
    );
    expect(screen.getByText('Not ranked')).toBeInTheDocument();
    expect(screen.getByLabelText(/first stake\. locked/i)).toBeInTheDocument();
  });
});
