-- Sync push uses the service-role client for idempotency receipts and sequence allocation.
-- RLS policies alone do not grant table-level access to service_role.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sync_mutation_receipts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sync_user_sequence TO service_role;
