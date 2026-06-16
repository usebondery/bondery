-- Enable Supabase Realtime for the subscriptions table so the webapp can
-- listen for subscription status changes via postgres_changes events.
--
-- REPLICA IDENTITY FULL is required so that UPDATE payloads include the new
-- row values (not just the primary key), allowing the hook to read `status`.

ALTER TABLE public.subscriptions REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;
