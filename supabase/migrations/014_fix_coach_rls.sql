-- ============================================================
-- FitGO — Migration 014: Fix RLS for Coach Sessions and Conversations
-- ============================================================

-- Fix coach_conversations RLS
DROP POLICY IF EXISTS "coach_own" ON public.coach_conversations;
CREATE POLICY "coach_conversations_own_all" ON public.coach_conversations
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Fix coach_sessions RLS
DROP POLICY IF EXISTS "coach_sessions_own" ON public.coach_sessions;
CREATE POLICY "coach_sessions_own_all" ON public.coach_sessions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
