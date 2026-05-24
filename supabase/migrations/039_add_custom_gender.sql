-- Migration 039: Add custom_gender column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS custom_gender TEXT;
