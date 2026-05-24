-- ─── 041: Sistema de Ligas "Guerras de Macros" ────────────────────────────────
-- Adds squads, squad_members, and league_points/streak to the users table.

-- 1. Add league columns to users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS league_points  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_log_date  date;

-- 2. Create squads table
CREATE TABLE IF NOT EXISTS public.squads (
  id          uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text    NOT NULL,
  league_tier text    NOT NULL DEFAULT 'carbono'
                      CHECK (league_tier IN ('carbono', 'neon', 'titanio', 'cuarzo', 'zenit')),
  points      integer NOT NULL DEFAULT 0,
  invite_code text    UNIQUE NOT NULL DEFAULT substring(md5(random()::text), 1, 8),
  created_by  uuid    NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at  timestamp with time zone DEFAULT timezone('utc', now()) NOT NULL
);

-- 3. Create squad_members table (max 5 enforced by trigger)
CREATE TABLE IF NOT EXISTS public.squad_members (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  squad_id   uuid NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at  timestamp with time zone DEFAULT timezone('utc', now()) NOT NULL,
  UNIQUE(squad_id, user_id)
);

-- 4. Trigger: enforce max 5 members per squad
CREATE OR REPLACE FUNCTION check_squad_max_members()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.squad_members WHERE squad_id = NEW.squad_id) >= 5 THEN
    RAISE EXCEPTION 'A squad cannot have more than 5 members.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_squad_max_members ON public.squad_members;
CREATE TRIGGER enforce_squad_max_members
  BEFORE INSERT ON public.squad_members
  FOR EACH ROW EXECUTE PROCEDURE check_squad_max_members();

-- 5. Create league_point_logs table (audit trail for points)
CREATE TABLE IF NOT EXISTS public.league_point_logs (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  squad_id   uuid REFERENCES public.squads(id) ON DELETE SET NULL,
  points     integer NOT NULL,
  reason     text NOT NULL, -- 'meal_log', 'macro_perfect', 'squad_synergy', 'streak_bonus'
  created_at timestamp with time zone DEFAULT timezone('utc', now()) NOT NULL
);

-- 6. RLS for squads
ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view squads" ON public.squads;
CREATE POLICY "Anyone can view squads" ON public.squads FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can create squads" ON public.squads;
CREATE POLICY "Users can create squads"  ON public.squads FOR INSERT WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "Creator can update squad" ON public.squads;
CREATE POLICY "Creator can update squad" ON public.squads FOR UPDATE USING (auth.uid() = created_by);
DROP POLICY IF EXISTS "Creator can delete squad" ON public.squads;
CREATE POLICY "Creator can delete squad" ON public.squads FOR DELETE USING (auth.uid() = created_by);

-- 7. RLS for squad_members
ALTER TABLE public.squad_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view their squad" ON public.squad_members;
CREATE POLICY "Members can view their squad" ON public.squad_members
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.squad_members sm2 WHERE sm2.squad_id = squad_id AND sm2.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "Users can join a squad" ON public.squad_members;
CREATE POLICY "Users can join a squad"    ON public.squad_members FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can leave a squad" ON public.squad_members;
CREATE POLICY "Users can leave a squad"   ON public.squad_members FOR DELETE USING (auth.uid() = user_id);

-- 8. RLS for league_point_logs
ALTER TABLE public.league_point_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own logs" ON public.league_point_logs;
CREATE POLICY "Users can view own logs"   ON public.league_point_logs FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "System can insert logs" ON public.league_point_logs;
CREATE POLICY "System can insert logs"    ON public.league_point_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 9. RPC: award points to a user and propagate to their squad
CREATE OR REPLACE FUNCTION award_league_points(
  p_user_id uuid,
  p_points  integer,
  p_reason  text
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_squad_id uuid;
BEGIN
  -- Update user league_points
  UPDATE public.users SET league_points = league_points + p_points WHERE id = p_user_id;

  -- Find user's squad
  SELECT squad_id INTO v_squad_id FROM public.squad_members WHERE user_id = p_user_id LIMIT 1;

  -- Update squad points if they belong to one
  IF v_squad_id IS NOT NULL THEN
    UPDATE public.squads SET points = points + p_points WHERE id = v_squad_id;
  END IF;

  -- Insert audit log
  INSERT INTO public.league_point_logs (user_id, squad_id, points, reason)
  VALUES (p_user_id, v_squad_id, p_points, p_reason);
END;
$$;

-- 10. RPC: get squad leaderboard (ordered by points)
CREATE OR REPLACE FUNCTION get_squad_leaderboard(p_squad_id uuid)
RETURNS TABLE(
  user_id       uuid,
  name          text,
  avatar_url    text,
  league_points integer,
  current_streak integer
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.name, u.avatar_url, u.league_points, u.current_streak
  FROM public.users u
  INNER JOIN public.squad_members sm ON sm.user_id = u.id
  WHERE sm.squad_id = p_squad_id
  ORDER BY u.league_points DESC;
END;
$$;

-- 11. RPC: recalculate league tier for a squad based on points
CREATE OR REPLACE FUNCTION recalculate_league_tier(p_squad_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_points integer;
  v_tier   text;
BEGIN
  SELECT points INTO v_points FROM public.squads WHERE id = p_squad_id;
  IF    v_points >= 5000 THEN v_tier := 'zenit';
  ELSIF v_points >= 2500 THEN v_tier := 'cuarzo';
  ELSIF v_points >= 1000 THEN v_tier := 'titanio';
  ELSIF v_points >= 400  THEN v_tier := 'neon';
  ELSE                        v_tier := 'carbono';
  END IF;
  UPDATE public.squads SET league_tier = v_tier WHERE id = p_squad_id;
END;
$$;

-- 12. Enable Realtime on squads and squad_members for live leaderboard updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.squads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.squad_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.league_point_logs;
