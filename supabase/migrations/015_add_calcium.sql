-- Migration 015: Add Calcium to Foods and Food Logs
ALTER TABLE public.foods ADD COLUMN IF NOT EXISTS calcium NUMERIC(8,2) DEFAULT 0;
ALTER TABLE public.food_logs ADD COLUMN IF NOT EXISTS calcium NUMERIC(8,2) DEFAULT 0;
