-- Fix infinite recursion in RLS policies for challenges and participants once and for all.
-- The previous attempt in 021 was still recursive because it self-referenced the same table.

-- 1. Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view challenges" ON public.challenges;
DROP POLICY IF EXISTS "Users can view participants" ON public.challenge_participants;

-- 2. Create a SECURITY DEFINER function to check membership without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.is_challenge_participant(_challenge_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- This bypasses RLS
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.challenge_participants
        WHERE challenge_id = _challenge_id AND user_id = _user_id
    );
END;
$$;

-- 3. New Challenges Policy
-- A user can see a challenge if they created it OR if they are a participant.
CREATE POLICY "Users can view challenges" ON public.challenges 
FOR SELECT USING (
    auth.uid() = creator_id OR 
    public.is_challenge_participant(id, auth.uid())
);

-- 4. New Challenge Participants Policy
-- A user can see participant records if:
-- a) It's their own record.
-- b) They are the creator of the challenge.
-- c) They are a participant in that same challenge.
CREATE POLICY "Users can view participants" ON public.challenge_participants 
FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.challenges 
        WHERE id = challenge_id AND creator_id = auth.uid()
    ) OR
    public.is_challenge_participant(challenge_id, auth.uid())
);

-- 5. Ensure other operations are still allowed
DROP POLICY IF EXISTS "Users can create challenges" ON public.challenges;
CREATE POLICY "Users can create challenges" ON public.challenges FOR INSERT WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can update challenges" ON public.challenges;
CREATE POLICY "Creators can update challenges" ON public.challenges FOR UPDATE USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can delete challenges" ON public.challenges;
CREATE POLICY "Creators can delete challenges" ON public.challenges FOR DELETE USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can add participants" ON public.challenge_participants;
CREATE POLICY "Creators can add participants" ON public.challenge_participants FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.challenges WHERE id = challenge_id AND creator_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can update their own participant status" ON public.challenge_participants;
CREATE POLICY "Users can update their own participant status" ON public.challenge_participants FOR UPDATE USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.challenges WHERE id = challenge_id AND creator_id = auth.uid())
);
