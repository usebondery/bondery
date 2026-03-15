-- Revert accidental rename: restore 'Networking interaction' back to 'Networking event'.

UPDATE public.interactions
SET type = 'Networking event'
WHERE type = 'Networking interaction';
