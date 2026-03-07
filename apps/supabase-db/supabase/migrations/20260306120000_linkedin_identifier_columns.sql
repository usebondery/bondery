-- Replace company/school LinkedIn URL columns with identifier-only columns.
--
-- Rationale: Instead of storing the full URL we only need the handle/slug
-- (e.g. "zs-associates" or a numeric ID like "960796"). The canonical URL is
-- always reconstructed server-side:
--   company → https://www.linkedin.com/company/{id}/
--   school  → https://www.linkedin.com/school/{id}/
--
-- Logo URLs are derived at read time from Supabase Storage using the pattern
--   linkedin_logos/{userId}/{linkedInId}.jpg
-- so the company_logo_url / school_logo_url columns are dropped.

-- ============================================================================
-- PEOPLE_WORK_HISTORY
-- ============================================================================

ALTER TABLE public.people_work_history
  RENAME COLUMN company_linkedin_url TO company_linkedin_id;

-- Strip URL prefix from any rows that already contain a full LinkedIn URL.
-- e.g. "https://www.linkedin.com/company/zs-associates/" → "zs-associates"
UPDATE public.people_work_history
SET company_linkedin_id = regexp_replace(
  company_linkedin_id,
  '^https?://(?:www\.)?linkedin\.com/(?:company|school|organization|showcase)/([^/?#]+)/?$',
  '\1',
  'i'
)
WHERE company_linkedin_id IS NOT NULL
  AND company_linkedin_id ILIKE '%linkedin.com%';

-- ============================================================================
-- people_education
-- ============================================================================

ALTER TABLE public.people_education
  RENAME COLUMN school_linkedin_url TO school_linkedin_id;

-- Strip URL prefix from any rows that already contain a full LinkedIn URL.
UPDATE public.people_education
SET school_linkedin_id = regexp_replace(
  school_linkedin_id,
  '^https?://(?:www\.)?linkedin\.com/(?:company|school|organization|showcase)/([^/?#]+)/?$',
  '\1',
  'i'
)
WHERE school_linkedin_id IS NOT NULL
  AND school_linkedin_id ILIKE '%linkedin.com%';

-- ============================================================================
-- DROP LOGO URL COLUMNS
-- Logo public URLs are now derived at API read-time from Supabase Storage:
--   linkedin_logos/{userId}/{linkedInId}.jpg
-- ============================================================================

ALTER TABLE public.people_work_history DROP COLUMN IF EXISTS company_logo_url;
ALTER TABLE public.people_education DROP COLUMN IF EXISTS school_logo_url;
