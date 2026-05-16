-- Add is_read column to direct_messages
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false;

-- Policy to allow marking messages as read (receiver only)
CREATE POLICY "Users can mark received messages as read" 
ON public.direct_messages 
FOR UPDATE 
USING (auth.uid() = receiver_id)
WITH CHECK (auth.uid() = receiver_id);
