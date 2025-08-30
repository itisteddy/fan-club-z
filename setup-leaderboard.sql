-- Create leaderboard view for user statistics
CREATE OR REPLACE VIEW user_leaderboard_stats AS
SELECT 
    u.id,
    u.username,
    u.full_name,
    u.avatar_url,
    COALESCE(created_stats.predictions_count, 0) as predictions_count,
    COALESCE(entry_stats.total_invested, 0) as total_invested,
    COALESCE(entry_stats.total_profit, 0) as total_profit,
    COALESCE(entry_stats.total_entries, 0) as total_entries,
    CASE 
        WHEN COALESCE(entry_stats.total_entries, 0) > 0 
        THEN ROUND((COALESCE(entry_stats.wins, 0)::DECIMAL / entry_stats.total_entries) * 100, 0)
        ELSE 0 
    END as win_rate
FROM users u
LEFT JOIN (
    SELECT 
        creator_id,
        COUNT(*) as predictions_count
    FROM predictions 
    WHERE status != 'cancelled'
    GROUP BY creator_id
) created_stats ON u.id = created_stats.creator_id
LEFT JOIN (
    SELECT 
        user_id,
        COUNT(*) as total_entries,
        SUM(amount) as total_invested,
        SUM(COALESCE(actual_payout, 0) - amount) as total_profit,
        COUNT(CASE WHEN status = 'won' THEN 1 END) as wins
    FROM prediction_entries
    GROUP BY user_id
) entry_stats ON u.id = entry_stats.user_id
WHERE u.id IN (
    SELECT DISTINCT creator_id FROM predictions WHERE creator_id IS NOT NULL
    UNION
    SELECT DISTINCT user_id FROM prediction_entries WHERE user_id IS NOT NULL
);
