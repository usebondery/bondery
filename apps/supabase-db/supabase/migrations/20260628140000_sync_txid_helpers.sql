-- Capture sync txid in the same transaction as a people row touch (call after related writes).
CREATE OR REPLACE FUNCTION public.bump_person_updated_at_for_sync(
  p_person_id uuid,
  p_user_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.people
  SET updated_at = now()
  WHERE id = p_person_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'person not found';
  END IF;

  RETURN pg_current_xact_id()::text;
END;
$$;

REVOKE ALL ON FUNCTION public.bump_person_updated_at_for_sync(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bump_person_updated_at_for_sync(uuid, uuid) TO authenticated, service_role;
