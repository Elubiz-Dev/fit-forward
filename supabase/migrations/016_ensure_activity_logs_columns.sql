-- Migration 016: Ensure Activity Logs Columns
-- Fixing "Could not find the 'calories' column" error

DO $$ 
BEGIN 
  -- Ensure calories column exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_logs' AND column_name = 'calories') THEN
    ALTER TABLE public.activity_logs ADD COLUMN calories INTEGER NOT NULL DEFAULT 0;
  END IF;

  -- Ensure duration column exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_logs' AND column_name = 'duration') THEN
    ALTER TABLE public.activity_logs ADD COLUMN duration INTEGER NOT NULL DEFAULT 0;
  END IF;

  -- Ensure icon column exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_logs' AND column_name = 'icon') THEN
    ALTER TABLE public.activity_logs ADD COLUMN icon TEXT;
  END IF;
END $$;
