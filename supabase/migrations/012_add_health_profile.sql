-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 012: Add Health Profile columns
-- Adds three new JSON/array columns to store the user's:
--   1. dietary_restrictions  – e.g. vegetarian, gluten-free
--   2. medical_conditions    – e.g. diabetes, hypertension
--   3. medications_supplements – e.g. creatine, multivitamins
--
  -- Each column stores an array of string keys (predefined + freetext values).
-- All columns are nullable so existing rows are not affected.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS dietary_restrictions TEXT [] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS medical_conditions TEXT [] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS medications_supplements TEXT [] DEFAULT NULL;
COMMENT ON COLUMN public.users.dietary_restrictions IS 'User-selected dietary restrictions (e.g. vegetarian, gluten_free). May include freetext entries.';
COMMENT ON COLUMN public.users.medical_conditions IS 'User-declared medical conditions relevant to nutrition planning.';
COMMENT ON COLUMN public.users.medications_supplements IS 'Current medications and/or supplements the user is taking.';