-- RPC: get_user_id_by_email
-- Returns the auth.users UUID for a given email address.
-- Used by the Polar webhook handler to resolve a customer email to a Bondery user ID.
-- Only callable by service_role to prevent email enumeration by unprivileged callers.

CREATE OR REPLACE FUNCTION public.get_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM auth.users
  WHERE email = p_email
  LIMIT 1;
$$;

-- Revoke from public (default), grant only to service_role
REVOKE ALL ON FUNCTION public.get_user_id_by_email(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_id_by_email(text) FROM anon;
REVOKE ALL ON FUNCTION public.get_user_id_by_email(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(text) TO service_role;
