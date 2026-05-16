-- ============================================================
-- FitGO — Migration 011: Fix meal constraint & add missing indexes
-- ============================================================

-- ─── 1. Relax food_logs.meal constraint to allow extra snacks ─
-- Extra snacks generate values like 'snack2', 'snack3', etc.
ALTER TABLE public.food_logs DROP CONSTRAINT IF EXISTS food_logs_meal_check;
ALTER TABLE public.food_logs ADD CONSTRAINT food_logs_meal_check
  CHECK (meal ~ '^(breakfast|lunch|dinner|snack\d*)$');

-- ─── 2. Add combined index for meal-level queries ─────────────
-- Improves performance when filtering food_logs by user + date + meal
CREATE INDEX IF NOT EXISTS idx_food_logs_user_date_meal
  ON public.food_logs (user_id, logged_at DESC, meal);

-- ─── 3. Add index on users.email (if not already created) ─────
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);

-- ─── 4. Ensure lifestyle and widgets_order columns exist ──────
-- (Consolidates migrations 004_add_lifestyle and 004_add_widgets_order)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS lifestyle TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS widgets_order TEXT[]
  DEFAULT '{"weight","bodyFat","sleep","calories","macros","measurements","photos","achievements"}';
