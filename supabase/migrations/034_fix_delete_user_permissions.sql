-- ============================================================
-- FitGO — Supabase Database Schema
-- Migration 034: Fix delete_user RPC permissions & logic
-- ============================================================

-- Redefine function without direct storage table deletion (Supabase forbids direct storage table edits)
CREATE OR REPLACE FUNCTION delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Deleting from auth.users will cascade down to public.users and other tables
  -- that have ON DELETE CASCADE constraints.
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

-- Ensure the authenticated role can execute the delete_user function
GRANT EXECUTE ON FUNCTION delete_user() TO authenticated;
