-- Update global ranking to use real activity points instead of approximating with calories.
-- Points calculation:
-- 10 points per food log entry
-- 50 points per activity log entry
-- This ensures new accounts start with 0 points.

CREATE OR REPLACE FUNCTION get_global_ranking(limit_val int DEFAULT 50)
RETURNS TABLE(id uuid, name text, avatar_url text, points numeric)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id, 
    u.name, 
    u.avatar_url, 
    COALESCE(
      (SELECT COUNT(*) FROM public.food_logs fl WHERE fl.user_id = u.id) * 10 +
      (SELECT COUNT(*) FROM public.activity_logs al WHERE al.user_id = u.id) * 50,
      0
    )::numeric as points
  FROM public.users u
  WHERE u.name IS NOT NULL
  ORDER BY points DESC
  LIMIT limit_val;
END;
$$;
