-- ============================================================
-- FitGO — Supabase Database Schema
-- Migration 026: Update delete_user RPC to clear storage
-- ============================================================

-- Function to allow a user to delete their own account and storage objects
CREATE OR REPLACE FUNCTION delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete all user files from storage objects
  -- Note: We use owner column which points to auth.users.id
  DELETE FROM storage.objects WHERE owner = auth.uid();

  -- Deleting from auth.users will cascade down to public.users and other tables
  -- that have ON DELETE CASCADE constraints.
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;
