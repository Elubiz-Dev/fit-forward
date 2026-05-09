-- ============================================================
-- FitGO — Migration 013: Fix RLS for Activities and Metrics
-- ============================================================

-- activity_logs
DROP POLICY IF EXISTS "activity_logs_own" ON public.activity_logs;
CREATE POLICY "activity_logs_own_all" ON public.activity_logs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- daily_metrics
DROP POLICY IF EXISTS "daily_metrics_own" ON public.daily_metrics;
CREATE POLICY "daily_metrics_own_all" ON public.daily_metrics
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- food_logs (just in case)
DROP POLICY IF EXISTS "food_logs_own" ON public.food_logs;
CREATE POLICY "food_logs_own_all" ON public.food_logs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
