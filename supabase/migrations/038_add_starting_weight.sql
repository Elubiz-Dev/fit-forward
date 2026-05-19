-- ============================================================
-- FitGO — Migration 038: Add starting_weight to users
-- Adds the missing `starting_weight` column referenced in
-- dashboard/index.tsx (profile.startingWeight) and the
-- Zustand auth store. Without this column the progress bar
-- in the Phase Card always shows 0%.
-- ============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS starting_weight NUMERIC(5,2);

-- Backfill: use current weight as the starting weight for all
-- existing users who do not have one yet.
UPDATE public.users
  SET starting_weight = weight
  WHERE starting_weight IS NULL
    AND weight IS NOT NULL;

-- Also ensure sleep tracking columns exist on daily_metrics
-- (used by the Sleep widget on the Dashboard)
ALTER TABLE public.daily_metrics
  ADD COLUMN IF NOT EXISTS sleep_hours   NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 5);

-- Analyze updated tables
ANALYZE public.users;
ANALYZE public.daily_metrics;
