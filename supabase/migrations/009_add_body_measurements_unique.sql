-- Migration 009: Add unique constraint to body_measurements
-- First, clean up existing duplicates by keeping only the most recent entry per day.
DO $$ BEGIN -- 1. Eliminar duplicados manteniendo solo el registro más reciente (por created_at)
DELETE FROM public.body_measurements
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
          ROW_NUMBER() OVER (
            PARTITION BY user_id,
            measured_at
            ORDER BY created_at DESC,
              id DESC
          ) as row_num
        FROM public.body_measurements
      ) t
    WHERE t.row_num > 1
  );
-- 2. Añadir la restricción única si no existe
IF NOT EXISTS (
  SELECT 1
  FROM pg_constraint
  WHERE conname = 'body_measurements_user_id_measured_at_key'
) THEN
ALTER TABLE public.body_measurements
ADD CONSTRAINT body_measurements_user_id_measured_at_key UNIQUE (user_id, measured_at);
END IF;
END $$;