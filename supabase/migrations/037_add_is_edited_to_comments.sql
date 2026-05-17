-- Add is_edited column to post_comments
ALTER TABLE public.post_comments ADD COLUMN IF NOT EXISTS is_edited boolean DEFAULT false NOT NULL;

-- Policy to allow users to update their own comments
DROP POLICY IF EXISTS "Users can update their own comments" ON public.post_comments;
CREATE POLICY "Users can update their own comments" ON public.post_comments FOR UPDATE USING (auth.uid() = user_id);
