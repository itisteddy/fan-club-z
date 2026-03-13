WITH base AS (
  SELECT
    user_id,
    GREATEST(0, COALESCE(demo_credits_balance, available_balance, 0))::numeric AS legacy_demo_credits
  FROM wallets
  WHERE currency = 'DEMO_USD'
), converted AS (
  SELECT
    user_id,
    legacy_demo_credits,
    (legacy_demo_credits / 10.0)::numeric AS converted_zaurum_uncapped
  FROM base
), stats AS (
  SELECT
    COUNT(*)::int AS user_count,
    MAX(legacy_demo_credits) AS max_demo_credits,
    percentile_cont(0.50) WITHIN GROUP (ORDER BY legacy_demo_credits) AS p50_demo,
    percentile_cont(0.90) WITHIN GROUP (ORDER BY legacy_demo_credits) AS p90_demo,
    percentile_cont(0.95) WITHIN GROUP (ORDER BY legacy_demo_credits) AS p95_demo,
    percentile_cont(0.99) WITHIN GROUP (ORDER BY legacy_demo_credits) AS p99_demo,
    MAX(converted_zaurum_uncapped) AS max_zaurum_uncapped,
    percentile_cont(0.50) WITHIN GROUP (ORDER BY converted_zaurum_uncapped) AS p50_zaurum_uncapped,
    percentile_cont(0.90) WITHIN GROUP (ORDER BY converted_zaurum_uncapped) AS p90_zaurum_uncapped,
    percentile_cont(0.95) WITHIN GROUP (ORDER BY converted_zaurum_uncapped) AS p95_zaurum_uncapped,
    percentile_cont(0.99) WITHIN GROUP (ORDER BY converted_zaurum_uncapped) AS p99_zaurum_uncapped
  FROM converted
), cap_impact AS (
  SELECT
    cap,
    COUNT(*) AS total_users,
    COUNT(*) FILTER (WHERE converted_zaurum_uncapped > cap) AS users_hit_cap,
    ROUND((100.0 * COUNT(*) FILTER (WHERE converted_zaurum_uncapped > cap) / NULLIF(COUNT(*),0))::numeric, 2) AS pct_hit_cap,
    SUM(converted_zaurum_uncapped) AS total_uncapped_zaurum,
    SUM(LEAST(converted_zaurum_uncapped, cap)) AS total_capped_zaurum,
    SUM(converted_zaurum_uncapped - LEAST(converted_zaurum_uncapped, cap)) AS total_trimmed_zaurum
  FROM converted
  CROSS JOIN (VALUES (250::numeric), (500::numeric), (750::numeric), (1000::numeric)) caps(cap)
  GROUP BY cap
), bands AS (
  SELECT
    CASE
      WHEN legacy_demo_credits = 0 THEN '0'
      WHEN legacy_demo_credits < 10 THEN '0.1-0.9 Z (1-9 demo)'
      WHEN legacy_demo_credits < 100 THEN '1-9.9 Z (10-99 demo)'
      WHEN legacy_demo_credits < 1000 THEN '10-99.9 Z (100-999 demo)'
      WHEN legacy_demo_credits < 5000 THEN '100-499.9 Z (1k-4,999 demo)'
      WHEN legacy_demo_credits < 10000 THEN '500-999.9 Z (5k-9,999 demo)'
      ELSE '1000+ Z (10k+ demo)'
    END AS balance_band,
    COUNT(*) AS users
  FROM converted
  GROUP BY 1
)
SELECT 'stats' AS section, row_to_json(stats) AS payload FROM stats
UNION ALL
SELECT 'cap_impact', json_agg(cap_impact ORDER BY cap_impact.cap) FROM cap_impact
UNION ALL
SELECT 'bands', json_agg(bands ORDER BY bands.balance_band) FROM bands;
