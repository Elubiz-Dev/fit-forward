-- Migration 004: Add lifestyle column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS lifestyle TEXT;
