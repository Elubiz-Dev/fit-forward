-- Migration 017: Add image_url to coach_conversations
ALTER TABLE public.coach_conversations ADD COLUMN IF NOT EXISTS image_url TEXT;
