-- 1. Create direct_messages table
CREATE TABLE IF NOT EXISTS public.direct_messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    receiver_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create index for faster querying
CREATE INDEX IF NOT EXISTS idx_direct_messages_participants 
ON public.direct_messages(sender_id, receiver_id);

CREATE INDEX IF NOT EXISTS idx_direct_messages_created_at
ON public.direct_messages(created_at DESC);

-- 3. Enable RLS
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies
-- Users can only see messages they sent or received
CREATE POLICY "Users can view their own direct messages" 
ON public.direct_messages 
FOR SELECT 
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can only send messages as themselves
CREATE POLICY "Users can send direct messages" 
ON public.direct_messages 
FOR INSERT 
WITH CHECK (auth.uid() = sender_id);
