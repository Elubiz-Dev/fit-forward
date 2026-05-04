-- ─── 1. TABLA: ACTIVITY LOGS ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id          UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID    NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name        TEXT    NOT NULL,
  icon        TEXT,
  calories    INTEGER NOT NULL DEFAULT 0,
  duration    INTEGER NOT NULL DEFAULT 0,
  logged_at   DATE    NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Asegurar que la columna 'logged_at' existe (por si la tabla se creó mal antes)
DO $$ BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_logs' AND column_name = 'logged_at') THEN
    ALTER TABLE public.activity_logs ADD COLUMN logged_at DATE NOT NULL DEFAULT CURRENT_DATE;
  END IF;
END $$;

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "activity_logs_own" ON public.activity_logs;
CREATE POLICY "activity_logs_own" ON public.activity_logs USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_date ON public.activity_logs (user_id, logged_at DESC);

-- ─── 2. TABLA: DAILY METRICS ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.daily_metrics (
  id              UUID       PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID       NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date            DATE       NOT NULL,
  water_ml        INTEGER    DEFAULT 0,
  steps           INTEGER    DEFAULT 0,
  sleep_hours     NUMERIC(4,1),
  neat_level      TEXT,
  exercise_level  TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, date)
);

ALTER TABLE public.daily_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "daily_metrics_own" ON public.daily_metrics;
CREATE POLICY "daily_metrics_own" ON public.daily_metrics USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_user_date ON public.daily_metrics (user_id, date DESC);

-- Trigger de actualización
DROP TRIGGER IF EXISTS daily_metrics_updated_at ON public.daily_metrics;
CREATE TRIGGER daily_metrics_updated_at BEFORE UPDATE ON public.daily_metrics
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ─── 3. TABLA: COACH SESSIONS ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.coach_sessions (
  id          UUID  PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID  NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title       TEXT  NOT NULL,
  coach_type  TEXT  CHECK (coach_type IN ('nutritionist', 'trainer')) DEFAULT 'nutritionist',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.coach_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coach_sessions_own" ON public.coach_sessions;
CREATE POLICY "coach_sessions_own" ON public.coach_sessions USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_coach_sessions_user ON public.coach_sessions (user_id, created_at DESC);

-- ─── 4. VINCULACIÓN DE CONVERSACIONES ─────────────────────────
ALTER TABLE public.coach_conversations ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.coach_sessions(id) ON DELETE SET NULL;
