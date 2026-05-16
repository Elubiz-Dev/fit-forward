-- ============================================================
-- FitGO — Supabase Database Schema
-- Migration 025: Add delete_user RPC
-- ============================================================

-- Function to allow a user to delete their own account
CREATE OR REPLACE FUNCTION delete_user()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  -- Deleting from auth.users will cascade down to public.users and other tables
  -- that have ON DELETE CASCADE constraints.
  DELETE FROM auth.users WHERE id = auth.uid();
$$;
