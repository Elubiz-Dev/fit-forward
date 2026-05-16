-- Update search function to also search by name
CREATE OR REPLACE FUNCTION search_users_by_email_or_id(search_query text)
RETURNS TABLE(id uuid, name text, email text, avatar_url text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.name, u.email, u.avatar_url
  FROM public.users u
  WHERE u.email ILIKE '%' || search_query || '%'
     OR u.name ILIKE '%' || search_query || '%'
     OR u.id::text = search_query
  LIMIT 20;
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY
  SELECT u.id, u.name, u.email, u.avatar_url
  FROM public.users u
  WHERE u.email ILIKE '%' || search_query || '%'
     OR u.name ILIKE '%' || search_query || '%'
  LIMIT 20;
END;
$$;
