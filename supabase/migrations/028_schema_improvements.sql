-- ============================================================
-- FitGO — Schema Improvements
-- Migration 028: Missing columns, new tables & indexes
-- ============================================================

-- ─── 1. users: add diet_type (selected in onboarding) ────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS diet_type TEXT
    CHECK (diet_type IN ('recommended','high_protein','low_carb','keto','low_fat'))
    DEFAULT 'recommended';

-- ─── 2. users: add target_weight (from onboarding velocity) ──
--  (already exists in most deploys via earlier migration;
--   use IF NOT EXISTS to be safe)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS target_weight    NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS starting_weight  NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS lifestyle        TEXT
    CHECK (lifestyle IN ('seated','standing_sometimes','standing_mostly','moving','physical_work')),
  ADD COLUMN IF NOT EXISTS extra_snacks     BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS available_foods  TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS widgets_order    TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS role             TEXT    DEFAULT 'user'
    CHECK (role IN ('user','pro','admin','super_admin')),
  ADD COLUMN IF NOT EXISTS dietary_restrictions    TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS medical_conditions      TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS medications_supplements TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS badges           TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS selected_badge   TEXT;

-- ─── 3. daily_metrics — one row per user per day ─────────────
-- Stores aggregated daily totals synced from nutritionStore.
CREATE TABLE IF NOT EXISTS public.daily_metrics (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date             DATE NOT NULL DEFAULT CURRENT_DATE,
  calories         NUMERIC(8,2) DEFAULT 0,
  protein          NUMERIC(8,2) DEFAULT 0,
  carbs            NUMERIC(8,2) DEFAULT 0,
  fat              NUMERIC(8,2) DEFAULT 0,
  water_glasses    INTEGER DEFAULT 0,
  steps            INTEGER DEFAULT 0,
  sleep_hours      NUMERIC(4,1),
  activity_calories NUMERIC(8,2) DEFAULT 0,  -- calories burned from logged activities
  weight           NUMERIC(5,2),             -- optional weight snapshot for the day
  body_fat_pct     NUMERIC(4,1),
  score            INTEGER,                  -- AI nutrition score 0–100
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT daily_metrics_user_date_unique UNIQUE (user_id, date)
);

-- Enable RLS on new table
ALTER TABLE public.daily_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policy: each user sees only their own rows
CREATE POLICY "daily_metrics_own"
  ON public.daily_metrics
  USING (auth.uid() = user_id);

-- Index for fast date-range queries
CREATE INDEX IF NOT EXISTS idx_daily_metrics_user_date
  ON public.daily_metrics (user_id, date DESC);

-- Auto-updated_at trigger for daily_metrics
DROP TRIGGER IF EXISTS daily_metrics_updated_at ON public.daily_metrics;
CREATE TRIGGER daily_metrics_updated_at
  BEFORE UPDATE ON public.daily_metrics
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ─── 4. food_logs: add snack sub-type and fiber/sodium ───────
--  (nutritionStore tracks snack2/snack3 as meal types)
ALTER TABLE public.food_logs
  DROP CONSTRAINT IF EXISTS food_logs_meal_check;

ALTER TABLE public.food_logs
  ADD CONSTRAINT food_logs_meal_check
    CHECK (meal IN ('breakfast','lunch','dinner','snack','snack2','snack3'));

-- Add missing micro-nutrient columns to food_logs
ALTER TABLE public.food_logs
  ADD COLUMN IF NOT EXISTS fiber  NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS sugar  NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS sodium NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS iron   NUMERIC(8,2);

-- ─── 5. Composite unique on food_logs to prevent duplicates ──
-- First, remove any existing exact duplicates to prevent unique index creation from failing
DELETE FROM public.food_logs a
USING public.food_logs b
WHERE a.user_id = b.user_id
  AND a.food_name = b.food_name
  AND a.meal = b.meal
  AND a.logged_at = b.logged_at
  AND a.grams = b.grams
  AND a.id > b.id;

-- Prevents the same food being logged twice in a single operation.
-- The check uses a partial unique index allowing nulls in food_id.
CREATE UNIQUE INDEX IF NOT EXISTS idx_food_logs_no_exact_dupes
  ON public.food_logs (user_id, food_name, meal, logged_at, grams)
  WHERE food_name IS NOT NULL;

-- ─── 6. progress_photos: add body_weight snapshot ────────────
ALTER TABLE public.progress_photos
  ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(5,2);

-- ─── 7. coach_conversations: add coach_type ──────────────────
ALTER TABLE public.coach_conversations
  ADD COLUMN IF NOT EXISTS coach_type TEXT DEFAULT 'nutritionist'
    CHECK (coach_type IN ('nutritionist','trainer','doctor')),
  ADD COLUMN IF NOT EXISTS session_id UUID;

-- ─── 8. Additional indexes ────────────────────────────────────
-- Faster lookups for coach history by session
CREATE INDEX IF NOT EXISTS idx_coach_session
  ON public.coach_conversations (user_id, session_id, msg_date DESC);

-- Faster lookups for progress photos by date
CREATE INDEX IF NOT EXISTS idx_progress_photos_user_date
  ON public.progress_photos (user_id, taken_at DESC);

-- ─── 9. Analyze updated tables ───────────────────────────────
ANALYZE public.users;
ANALYZE public.food_logs;
ANALYZE public.daily_metrics;
ANALYZE public.coach_conversations;
ANALYZE public.progress_photos;
