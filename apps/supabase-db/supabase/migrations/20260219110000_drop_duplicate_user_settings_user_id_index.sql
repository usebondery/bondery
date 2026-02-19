-- Remove duplicate index on public.user_settings(user_id).
-- Keep the unique-constraint-backed index (user_settings_user_id_key).

DROP INDEX IF EXISTS public.user_settings_user_id_idx;
