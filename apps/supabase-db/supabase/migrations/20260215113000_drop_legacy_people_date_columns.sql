-- Drop legacy date columns from people table
-- These fields are replaced by normalized people_important_events storage

ALTER TABLE public.people
  DROP COLUMN IF EXISTS birthdate,
  DROP COLUMN IF EXISTS notify_birthday,
  DROP COLUMN IF EXISTS important_dates; 
