-- Update activity type labels to align with UI terminology
-- 1) Rename legacy Networking type to Networking event
-- 2) Support Competition/Hackathon type (stored as text, no enum migration required)

UPDATE public.activities
SET type = 'Networking event'
WHERE type = 'Networking';
