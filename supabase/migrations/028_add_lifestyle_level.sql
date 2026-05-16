-- Migration 028: Add lifestyle_level to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS lifestyle_level TEXT CHECK (lifestyle_level IN ('seated', 'standing_sometimes', 'standing_mostly', 'moving', 'physical_work'));

-- Update existing users to a default if needed (optional)
-- UPDATE public.users SET lifestyle_level = 'seated' WHERE lifestyle_level IS NULL;
