-- ============================================================
-- FitGO — Database Audit & Cleanup Script
-- Migration 027: Diagnostic queries + garbage collection
-- Run each section manually and review results before deleting.
-- ============================================================

-- ════════════════════════════════════════════════════════════
-- SECTION 1: DIAGNOSTICS — Read-only checks (run first)
-- ════════════════════════════════════════════════════════════

-- ─── 1.1 Auth users WITHOUT a public.users profile (orphaned auth) ───
SELECT
  au.id        AS auth_user_id,
  au.email     AS auth_email,
  au.created_at AS auth_created_at,
  au.last_sign_in_at
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL
ORDER BY au.created_at DESC;

-- ─── 1.2 public.users WITHOUT an auth.users entry (ghost profiles) ───
SELECT
  pu.id,
  pu.email,
  pu.name,
  pu.created_at
FROM public.users pu
LEFT JOIN auth.users au ON au.id = pu.id
WHERE au.id IS NULL
ORDER BY pu.created_at DESC;

-- ─── 1.3 food_logs with no matching user (cascade missed) ───
SELECT fl.id, fl.user_id, fl.food_name, fl.logged_at
FROM public.food_logs fl
LEFT JOIN public.users u ON u.id = fl.user_id
WHERE u.id IS NULL;

-- ─── 1.4 body_measurements with no matching user ───
SELECT bm.id, bm.user_id, bm.measured_at
FROM public.body_measurements bm
LEFT JOIN public.users u ON u.id = bm.user_id
WHERE u.id IS NULL;

-- ─── 1.5 coach_conversations with no matching user ───
SELECT cc.id, cc.user_id, cc.role, cc.msg_date
FROM public.coach_conversations cc
LEFT JOIN public.users u ON u.id = cc.user_id
WHERE u.id IS NULL;

-- ─── 1.6 meal_plans with no matching user ───
SELECT mp.id, mp.user_id, mp.title, mp.week_start
FROM public.meal_plans mp
LEFT JOIN public.users u ON u.id = mp.user_id
WHERE u.id IS NULL;

-- ─── 1.7 meal_plan_items with no matching meal_plan ───
SELECT mpi.id, mpi.plan_id, mpi.name
FROM public.meal_plan_items mpi
LEFT JOIN public.meal_plans mp ON mp.id = mpi.plan_id
WHERE mp.id IS NULL;

-- ─── 1.8 posts with no matching user ───
SELECT p.id, p.user_id, p.created_at, p.image_url
FROM public.posts p
LEFT JOIN public.users u ON u.id = p.user_id
WHERE u.id IS NULL;

-- ─── 1.9 post_likes with no matching post or user ───
SELECT pl.id, pl.post_id, pl.user_id
FROM public.post_likes pl
LEFT JOIN public.posts p ON p.id = pl.post_id
LEFT JOIN public.users u ON u.id = pl.user_id
WHERE p.id IS NULL OR u.id IS NULL;

-- ─── 1.10 post_comments with no matching post or user ───
SELECT pc.id, pc.post_id, pc.user_id, pc.content
FROM public.post_comments pc
LEFT JOIN public.posts p ON p.id = pc.post_id
LEFT JOIN public.users u ON u.id = pc.user_id
WHERE p.id IS NULL OR u.id IS NULL;

-- ─── 1.11 friends with no matching users on either side ───
SELECT f.id, f.user_id_1, f.user_id_2, f.status
FROM public.friends f
LEFT JOIN public.users u1 ON u1.id = f.user_id_1
LEFT JOIN public.users u2 ON u2.id = f.user_id_2
WHERE u1.id IS NULL OR u2.id IS NULL;

-- ─── 1.12 progress_photos with no matching user ───
SELECT pp.id, pp.user_id, pp.storage_url, pp.taken_at
FROM public.progress_photos pp
LEFT JOIN public.users u ON u.id = pp.user_id
WHERE u.id IS NULL;

-- ─── 1.13 user_subscriptions with no matching user ───
SELECT us.id, us.user_id, us.status, us.expires_at
FROM public.user_subscriptions us
LEFT JOIN public.users u ON u.id = us.user_id
WHERE u.id IS NULL;

-- ─── 1.14 Duplicate food_logs (same user, food, meal, date) ───
SELECT
  user_id, food_name, meal, logged_at,
  COUNT(*) AS duplicates
FROM public.food_logs
GROUP BY user_id, food_name, meal, logged_at
HAVING COUNT(*) > 1
ORDER BY duplicates DESC;

-- ─── 1.15 Duplicate body_measurements (same user, date) ───
SELECT
  user_id, measured_at,
  COUNT(*) AS duplicates
FROM public.body_measurements
GROUP BY user_id, measured_at
HAVING COUNT(*) > 1
ORDER BY duplicates DESC;

-- ─── 1.16 Stale/expired subscriptions still marked active ───
SELECT id, user_id, product_id, status, expires_at
FROM public.user_subscriptions
WHERE status = 'active'
  AND expires_at IS NOT NULL
  AND expires_at < NOW();

-- ─── 1.17 users with onboarding_done = false older than 7 days (incomplete registrations) ───
SELECT id, email, name, created_at
FROM public.users
WHERE onboarding_done = false
  AND created_at < NOW() - INTERVAL '7 days'
ORDER BY created_at ASC;

-- ─── 1.18 Orphaned foods cache (never referenced in any food_log) ───
SELECT f.id, f.name, f.brand, f.source, f.created_at
FROM public.foods f
LEFT JOIN public.food_logs fl ON fl.food_id = f.id
WHERE fl.id IS NULL
ORDER BY f.created_at ASC;

-- ─── 1.19 Storage files in 'social' bucket vs posts table (DB side check) ───
-- Posts with image_url but the url looks broken or empty
SELECT id, user_id, image_url, created_at
FROM public.posts
WHERE image_url IS NOT NULL
  AND image_url NOT LIKE 'https://%'
ORDER BY created_at DESC;

-- ─── 1.20 Database size overview ───
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname || '.' || tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)
    - pg_relation_size(schemaname || '.' || tablename)) AS index_size,
  (SELECT COUNT(*) FROM information_schema.tables t2
   WHERE t2.table_schema = schemaname AND t2.table_name = tablename) AS exists
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;

-- ─── 1.21 Row counts per table ───
SELECT
  'public.users'                  AS table_name, COUNT(*) FROM public.users              UNION ALL
SELECT 'public.food_logs',          COUNT(*) FROM public.food_logs                       UNION ALL
SELECT 'public.body_measurements',  COUNT(*) FROM public.body_measurements               UNION ALL
SELECT 'public.meal_plans',         COUNT(*) FROM public.meal_plans                      UNION ALL
SELECT 'public.meal_plan_items',    COUNT(*) FROM public.meal_plan_items                 UNION ALL
SELECT 'public.coach_conversations',COUNT(*) FROM public.coach_conversations             UNION ALL
SELECT 'public.user_subscriptions', COUNT(*) FROM public.user_subscriptions              UNION ALL
SELECT 'public.progress_photos',    COUNT(*) FROM public.progress_photos                 UNION ALL
SELECT 'public.foods',              COUNT(*) FROM public.foods                           UNION ALL
SELECT 'public.recipes',            COUNT(*) FROM public.recipes                         UNION ALL
SELECT 'public.posts',              COUNT(*) FROM public.posts                           UNION ALL
SELECT 'public.post_likes',         COUNT(*) FROM public.post_likes                      UNION ALL
SELECT 'public.post_comments',      COUNT(*) FROM public.post_comments                   UNION ALL
SELECT 'public.friends',            COUNT(*) FROM public.friends
ORDER BY 2 DESC;


-- ════════════════════════════════════════════════════════════
-- SECTION 2: CLEANUP — Destructive (review diagnostics first!)
-- Uncomment and run each block individually after confirming
-- the diagnostic queries above show garbage records.
-- ════════════════════════════════════════════════════════════

-- ─── 2.1 Delete orphaned food_logs (user no longer exists) ───
/*
DELETE FROM public.food_logs
WHERE user_id NOT IN (SELECT id FROM public.users);
*/

-- ─── 2.2 Delete orphaned body_measurements ───
/*
DELETE FROM public.body_measurements
WHERE user_id NOT IN (SELECT id FROM public.users);
*/

-- ─── 2.3 Delete orphaned coach_conversations ───
/*
DELETE FROM public.coach_conversations
WHERE user_id NOT IN (SELECT id FROM public.users);
*/

-- ─── 2.4 Delete orphaned meal_plan_items (cascade-missed) ───
/*
DELETE FROM public.meal_plan_items
WHERE plan_id NOT IN (SELECT id FROM public.meal_plans);
*/

-- ─── 2.5 Delete orphaned meal_plans ───
/*
DELETE FROM public.meal_plans
WHERE user_id NOT IN (SELECT id FROM public.users);
*/

-- ─── 2.6 Delete orphaned post_likes and post_comments ───
/*
DELETE FROM public.post_likes
WHERE post_id NOT IN (SELECT id FROM public.posts)
   OR user_id NOT IN (SELECT id FROM public.users);

DELETE FROM public.post_comments
WHERE post_id NOT IN (SELECT id FROM public.posts)
   OR user_id NOT IN (SELECT id FROM public.users);
*/

-- ─── 2.7 Delete orphaned posts ───
/*
DELETE FROM public.posts
WHERE user_id NOT IN (SELECT id FROM public.users);
*/

-- ─── 2.8 Delete orphaned friends relationships ───
/*
DELETE FROM public.friends
WHERE user_id_1 NOT IN (SELECT id FROM public.users)
   OR user_id_2 NOT IN (SELECT id FROM public.users);
*/

-- ─── 2.9 Delete orphaned progress_photos ───
/*
DELETE FROM public.progress_photos
WHERE user_id NOT IN (SELECT id FROM public.users);
*/

-- ─── 2.10 Delete orphaned user_subscriptions ───
/*
DELETE FROM public.user_subscriptions
WHERE user_id NOT IN (SELECT id FROM public.users);
*/

-- ─── 2.11 Fix stale subscriptions (mark expired if past expiry date) ───
/*
UPDATE public.user_subscriptions
SET status = 'expired'
WHERE status = 'active'
  AND expires_at IS NOT NULL
  AND expires_at < NOW();
*/

-- ─── 2.12 Clean up ghost public.users profiles (no auth.users entry) ───
-- WARNING: This will cascade-delete ALL related data for those users.
/*
DELETE FROM public.users
WHERE id NOT IN (SELECT id FROM auth.users);
*/

-- ─── 2.13 Remove duplicate food_logs — keep only the newest per group ───
/*
DELETE FROM public.food_logs
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, food_name, meal, logged_at)
    id
  FROM public.food_logs
  ORDER BY user_id, food_name, meal, logged_at, created_at DESC
);
*/

-- ─── 2.14 Remove duplicate body_measurements — keep newest per user+date ───
/*
DELETE FROM public.body_measurements
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, measured_at)
    id
  FROM public.body_measurements
  ORDER BY user_id, measured_at, created_at DESC
);
*/

-- ─── 2.15 Purge unreferenced foods cache (never used in any food_log) ───
-- Optional: only run if cache bloat is confirmed from diagnostic 1.18
/*
DELETE FROM public.foods
WHERE id NOT IN (
  SELECT DISTINCT food_id FROM public.food_logs WHERE food_id IS NOT NULL
);
*/

-- ─── 2.16 Purge incomplete user registrations older than 7 days ───
-- WARNING: This removes auth + all data for users who never finished onboarding.
-- Use delete_user() RPC instead if you have it configured.
/*
DELETE FROM public.users
WHERE onboarding_done = false
  AND created_at < NOW() - INTERVAL '7 days';
*/


-- ════════════════════════════════════════════════════════════
-- SECTION 3: MAINTENANCE — VACUUM & ANALYZE
-- ════════════════════════════════════════════════════════════

-- Re-analyze statistics for the query planner (safe to run anytime)
ANALYZE public.users;
ANALYZE public.food_logs;
ANALYZE public.body_measurements;
ANALYZE public.meal_plans;
ANALYZE public.meal_plan_items;
ANALYZE public.coach_conversations;
ANALYZE public.user_subscriptions;
ANALYZE public.progress_photos;
ANALYZE public.foods;
ANALYZE public.posts;
ANALYZE public.post_likes;
ANALYZE public.post_comments;
ANALYZE public.friends;

-- NOTE: VACUUM FULL requires superuser and locks the table.
-- In Supabase, use the Dashboard > Database > Maintenance tab instead.
-- VACUUM ANALYZE public.food_logs;
