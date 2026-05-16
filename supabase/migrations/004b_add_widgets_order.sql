-- ============================================================
-- FitGO — Supabase Database Schema
-- Migration 004: Add widgets_order to users
-- ============================================================

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS widgets_order TEXT[] DEFAULT '{"weight", "bodyFat", "sleep", "calories", "macros", "measurements", "photos", "achievements"}';
