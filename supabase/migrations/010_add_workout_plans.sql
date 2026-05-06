-- Migration 010: Add Workout Plans
CREATE TABLE IF NOT EXISTS public.workout_plans (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  week_start    DATE NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.workout_plan_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id       UUID NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  day_of_week   TEXT CHECK (day_of_week IN ('Mon','Tue','Wed','Thu','Fri','Sat','Sun')),
  routine_name  TEXT NOT NULL,
  exercises     JSONB DEFAULT '[]'::jsonb,
  notes         TEXT
);

ALTER TABLE public.workout_plans      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_plan_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workout_plans_own" ON public.workout_plans USING (auth.uid() = user_id);
CREATE POLICY "workout_plan_items_own" ON public.workout_plan_items USING (
  plan_id IN (SELECT id FROM public.workout_plans WHERE user_id = auth.uid())
);

CREATE INDEX IF NOT EXISTS idx_workout_plans_user ON public.workout_plans (user_id, week_start DESC);
