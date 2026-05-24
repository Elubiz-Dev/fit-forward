-- ─── 042: Fix Infinite Recursion in squad_members RLS ─────────────────────────
-- PROBLEM:
--   The SELECT policy on squad_members references squad_members itself in a
--   subquery, causing infinite recursion when Postgres evaluates the policy.
--   The check_squad_max_members trigger also does a plain SELECT on squad_members
--   which hits the same recursive policy.
--
-- SOLUTION:
--   1. Replace the recursive SELECT policy with a simple, non-recursive one
--      (a user can only directly see rows where they are the user_id).
--   2. Use a SECURITY DEFINER helper function for the trigger count so it
--      bypasses RLS entirely.
--   3. Keep INSERT / DELETE policies unchanged (they are already correct).

-- ── Step 1: Drop and recreate the broken SELECT policy ────────────────────────
DROP POLICY IF EXISTS "Members can view their squad" ON public.squad_members;

-- Simple, non-recursive: each user can see their own membership rows.
-- The leaderboard is fetched via the get_squad_leaderboard RPC (SECURITY DEFINER),
-- so it does NOT need cross-member visibility here.
CREATE POLICY "Members can view their squad" ON public.squad_members
  FOR SELECT USING (auth.uid() = user_id);

-- ── Step 2: Fix the max-members trigger to bypass RLS ─────────────────────────
-- We wrap the COUNT in a SECURITY DEFINER function so it reads the raw table
-- without triggering the RLS policy (which would recurse).
CREATE OR REPLACE FUNCTION check_squad_max_members()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER           -- ← runs as the function owner, bypasses RLS
SET search_path = public
AS $$
BEGIN
  IF (
    SELECT COUNT(*)
    FROM public.squad_members
    WHERE squad_id = NEW.squad_id
  ) >= 5 THEN
    RAISE EXCEPTION 'A squad cannot have more than 5 members.';
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate the trigger (in case it was pointing to the old function body)
DROP TRIGGER IF EXISTS enforce_squad_max_members ON public.squad_members;
CREATE TRIGGER enforce_squad_max_members
  BEFORE INSERT ON public.squad_members
  FOR EACH ROW EXECUTE PROCEDURE check_squad_max_members();

-- ── Step 3: Ensure the RPCs are still SECURITY DEFINER (sanity check) ─────────
-- get_squad_leaderboard already has SECURITY DEFINER from migration 041,
-- but we restate it here to make the intent explicit.
CREATE OR REPLACE FUNCTION get_squad_leaderboard(p_squad_id uuid)
RETURNS TABLE(
  user_id        uuid,
  name           text,
  avatar_url     text,
  league_points  integer,
  current_streak integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.name, u.avatar_url, u.league_points, u.current_streak
  FROM public.users u
  INNER JOIN public.squad_members sm ON sm.user_id = u.id
  WHERE sm.squad_id = p_squad_id
  ORDER BY u.league_points DESC;
END;
$$;

-- ── Done ──────────────────────────────────────────────────────────────────────
-- After applying this migration the following should work without recursion:
--   • INSERT into squad_members  (creating or joining a squad)
--   • SELECT from squad_members  (viewing own membership)
--   • get_squad_leaderboard RPC  (full leaderboard for a squad)
