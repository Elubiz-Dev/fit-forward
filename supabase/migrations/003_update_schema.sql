-- ============================================================
-- FitGO — Update Schema for New Features
-- Migration 003: Add coach_type and new nutrients
-- ============================================================

-- 1. Add coach_type to coach_conversations
ALTER TABLE public.coach_conversations 
ADD COLUMN IF NOT EXISTS coach_type TEXT CHECK (coach_type IN ('nutritionist', 'trainer')) DEFAULT 'nutritionist';

-- 2. Add extra nutrients to food_logs
ALTER TABLE public.food_logs 
ADD COLUMN IF NOT EXISTS sugar NUMERIC(8,2),
ADD COLUMN IF NOT EXISTS fiber NUMERIC(8,2),
ADD COLUMN IF NOT EXISTS sodium NUMERIC(8,2),
ADD COLUMN IF NOT EXISTS iron NUMERIC(8,2),
ADD COLUMN IF NOT EXISTS saturated_fat NUMERIC(8,2),
ADD COLUMN IF NOT EXISTS trans_fat NUMERIC(8,2);
