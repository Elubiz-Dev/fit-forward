-- ============================================================
-- FitGO — Migration 006: Add missing columns to users table
-- Columns used in app code but absent from schema
-- ============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS available_foods  TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS starting_weight  NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS extra_snacks     INTEGER DEFAULT 0;

-- Index for food availability queries
CREATE INDEX IF NOT EXISTS idx_users_available_foods ON public.users USING GIN (available_foods);
