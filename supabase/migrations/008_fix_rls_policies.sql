-- ============================================================
-- FitGO — Migration 008: Fix RLS policies & add missing indexes
-- ============================================================

-- ─── Safe admin check function (avoids recursive subquery) ───
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Drop old recursive policy and replace with safe version
DROP POLICY IF EXISTS "admins_read_all_users" ON public.users;

CREATE POLICY "admins_read_all_users" ON public.users
  FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

-- ─── Protect is_pro and role from user self-modification ─────
-- Users can update their own row, but cannot elevate role/is_pro
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM public.users WHERE id = auth.uid())
    AND is_pro = (SELECT is_pro FROM public.users WHERE id = auth.uid())
  );

-- ─── Missing index on email ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);

-- ─── Progress photos storage bucket policies ──────────────────
-- Note: The actual bucket creation must be done via Supabase dashboard.
-- This migration only documents the required policies.
-- Bucket name: 'progress-photos'
-- Bucket name: 'avatars'
