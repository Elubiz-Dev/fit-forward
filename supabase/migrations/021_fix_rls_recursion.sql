-- Fix infinite recursion in RLS policies for challenges and participants

-- 1. Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view challenges they created or participate in" ON public.challenges;
DROP POLICY IF EXISTS "Users can view participants of their challenges" ON public.challenge_participants;

-- 2. New Challenges Policy
-- A user can see a challenge if they created it OR if they are a participant.
-- To avoid recursion, we use a subquery that doesn't trigger a mutual loop if possible,
-- or we simplify the participants check.
CREATE POLICY "Users can view challenges" ON public.challenges FOR SELECT USING (
    auth.uid() = creator_id OR 
    EXISTS (
        SELECT 1 FROM public.challenge_participants 
        WHERE challenge_id = public.challenges.id AND user_id = auth.uid()
    )
);

-- 3. New Challenge Participants Policy
-- A user can see participant records if:
-- a) It's their own record.
-- b) They are a participant in the same challenge.
-- IMPORTANT: We DO NOT check the challenges table here to avoid the infinite loop 
-- (since the challenges policy already checks this table).
CREATE POLICY "Users can view participants" ON public.challenge_participants FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.challenge_participants cp 
        WHERE cp.challenge_id = public.challenge_participants.challenge_id 
        AND cp.user_id = auth.uid()
    )
);

-- Note: The creator of a challenge should always add themselves as a participant 
-- if they want to see/manage participants through these policies.
