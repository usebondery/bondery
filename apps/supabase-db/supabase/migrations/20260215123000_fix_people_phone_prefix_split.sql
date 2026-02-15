-- Repair phone rows where one local digit was mistakenly appended to Czech/Slovak prefix
-- Example: +4207 + 77777777 => +420 + 777777777

UPDATE public.people_phones
SET
  prefix = '+420',
  value = right(prefix, 1) || value,
  updated_at = now()
WHERE prefix ~ '^\+420\d$'
  AND value ~ '^\d{8}$';

UPDATE public.people_phones
SET
  prefix = '+421',
  value = right(prefix, 1) || value,
  updated_at = now()
WHERE prefix ~ '^\+421\d$'
  AND value ~ '^\d{8}$';
