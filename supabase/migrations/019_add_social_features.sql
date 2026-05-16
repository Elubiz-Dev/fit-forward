-- 1. Create friends table
CREATE TABLE IF NOT EXISTS public.friends (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id_1 uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    user_id_2 uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id_1, user_id_2)
);

-- 2. Create challenges table
CREATE TABLE IF NOT EXISTS public.challenges (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    creator_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    type text NOT NULL, -- e.g., 'steps', 'calories_burned', 'streak'
    target_value numeric NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create challenge_participants table
CREATE TABLE IF NOT EXISTS public.challenge_participants (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    progress numeric DEFAULT 0 NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(challenge_id, user_id)
);

-- 4. RLS for friends
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own friends" ON public.friends FOR SELECT USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);
CREATE POLICY "Users can insert friends" ON public.friends FOR INSERT WITH CHECK (auth.uid() = user_id_1);
CREATE POLICY "Users can update their own friend requests" ON public.friends FOR UPDATE USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);
CREATE POLICY "Users can delete their friends" ON public.friends FOR DELETE USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

-- 5. RLS for challenges
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view challenges they created or participate in" ON public.challenges FOR SELECT USING (
    auth.uid() = creator_id OR 
    EXISTS (SELECT 1 FROM public.challenge_participants cp WHERE cp.challenge_id = id AND cp.user_id = auth.uid())
);
CREATE POLICY "Users can create challenges" ON public.challenges FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can update challenges" ON public.challenges FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Creators can delete challenges" ON public.challenges FOR DELETE USING (auth.uid() = creator_id);

-- 6. RLS for challenge_participants
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view participants of their challenges" ON public.challenge_participants FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = challenge_id AND c.creator_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.challenge_participants cp2 WHERE cp2.challenge_id = challenge_id AND cp2.user_id = auth.uid())
);
CREATE POLICY "Creators can add participants" ON public.challenge_participants FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = challenge_id AND c.creator_id = auth.uid()) OR
    auth.uid() = user_id
);
CREATE POLICY "Users can update their own participant status" ON public.challenge_participants FOR UPDATE USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = challenge_id AND c.creator_id = auth.uid())
);

-- 7. Search Users RPC
CREATE OR REPLACE FUNCTION search_users_by_email_or_id(search_query text)
RETURNS TABLE(id uuid, name text, email text, avatar_url text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.name, u.email, u.avatar_url
  FROM public.users u
  WHERE u.email ILIKE '%' || search_query || '%'
     OR u.id::text = search_query
  LIMIT 20;
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY
  SELECT u.id, u.name, u.email, u.avatar_url
  FROM public.users u
  WHERE u.email ILIKE '%' || search_query || '%'
  LIMIT 20;
END;
$$;

-- 8. Global Ranking View or RPC
CREATE OR REPLACE FUNCTION get_global_ranking(limit_val int DEFAULT 50)
RETURNS TABLE(id uuid, name text, avatar_url text, points numeric)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- We'll approximate ranking points based on target calories or just give random for demo since we lack a central points column.
  -- In a real scenario, you'd calculate streaks or points.
  RETURN QUERY
  SELECT u.id, u.name, u.avatar_url, (u.target_calories / 10)::numeric as points
  FROM public.users u
  WHERE u.name IS NOT NULL
  ORDER BY points DESC
  LIMIT limit_val;
END;
$$;
