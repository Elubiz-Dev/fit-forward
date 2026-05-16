-- Allow all authenticated users to read basic profile information (name, avatar_url) of other users.
-- This is necessary for the social feed to display post creators and commenters.

DROP POLICY IF EXISTS "Profiles are readable by everyone" ON public.users;
CREATE POLICY "Profiles are readable by everyone" ON public.users 
FOR SELECT USING (auth.role() = 'authenticated');
