-- Drop unused uuid-ossp extension from public schema.
-- Tables use gen_random_uuid() (built-in); no uuid_generate_* calls in the codebase.
-- Removes Supabase advisor lint 0014_extension_in_public for this extension.

DROP EXTENSION IF EXISTS "uuid-ossp";
