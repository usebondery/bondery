-- Remove Electric logical replication (replaced by sync_change_log pull).

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'electric_publication') THEN
    DROP PUBLICATION electric_publication;
  END IF;
END
$$;

REVOKE SELECT ON
  public.people,
  public.people_phones,
  public.people_emails,
  public.people_addresses,
  public.people_socials,
  public.groups,
  public.people_groups,
  public.tags,
  public.people_tags,
  public.people_important_dates
FROM electric_role;
