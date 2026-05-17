-- ============================================================
-- FitGO — Add Unlocked Achievements
-- Migration 036: Add unlocked_achievements column to users
-- ============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS unlocked_achievements TEXT[] DEFAULT '{}';

-- Analyze updated table
ANALYZE public.users;
