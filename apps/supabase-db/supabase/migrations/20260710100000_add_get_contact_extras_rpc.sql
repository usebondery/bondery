-- Batch-load phones, emails, addresses, and socials for contact list enrichment.
-- POST body avoids PostgREST URL limits from large person_id IN (...) filters.
-- JSON shape v1: { "<person_id>": { phones, emails, addresses, linkedin, ... } }

CREATE OR REPLACE FUNCTION public.get_contact_extras(
  p_user_id uuid,
  p_person_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF p_person_ids IS NULL OR cardinality(p_person_ids) = 0 THEN
    RETURN '{}'::jsonb;
  END IF;

  WITH ids AS (
    SELECT unnest(p_person_ids) AS person_id
  ),
  phones AS (
    SELECT
      pp.person_id,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'preferred', pp.preferred,
            'prefix', pp.prefix,
            'type', CASE WHEN pp.type = 'work' THEN 'work' ELSE 'home' END,
            'value', pp.value
          )
          ORDER BY pp.sort_order ASC, pp.created_at ASC
        ),
        '[]'::jsonb
      ) AS items
    FROM public.people_phones pp
    WHERE pp.user_id = p_user_id
      AND pp.person_id = ANY(p_person_ids)
    GROUP BY pp.person_id
  ),
  emails AS (
    SELECT
      pe.person_id,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'preferred', pe.preferred,
            'type', CASE WHEN pe.type = 'work' THEN 'work' ELSE 'home' END,
            'value', pe.value
          )
          ORDER BY pe.sort_order ASC, pe.created_at ASC
        ),
        '[]'::jsonb
      ) AS items
    FROM public.people_emails pe
    WHERE pe.user_id = p_user_id
      AND pe.person_id = ANY(p_person_ids)
    GROUP BY pe.person_id
  ),
  addresses AS (
    SELECT
      pa.person_id,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'type', CASE
              WHEN pa.type = 'work' THEN 'work'
              WHEN pa.type = 'other' THEN 'other'
              ELSE 'home'
            END,
            'label', pa.label,
            'value', pa.value,
            'latitude', pa.latitude,
            'longitude', pa.longitude,
            'addressLine1', pa.address_line1,
            'addressLine2', pa.address_line2,
            'addressCity', pa.address_city,
            'addressPostalCode', pa.address_postal_code,
            'addressState', pa.address_state,
            'addressStateCode', pa.address_state_code,
            'addressCountry', pa.address_country,
            'addressCountryCode', pa.address_country_code,
            'addressGranularity', CASE
              WHEN pa.address_granularity = 'city' THEN 'city'
              WHEN pa.address_granularity = 'state' THEN 'state'
              WHEN pa.address_granularity = 'country' THEN 'country'
              ELSE 'address'
            END,
            'addressFormatted', pa.address_formatted,
            'addressGeocodeSource', pa.address_geocode_source,
            'geocodeConfidence', pa.geocode_confidence,
            'timezone', pa.timezone
          )
          ORDER BY pa.sort_order ASC, pa.created_at ASC
        ),
        '[]'::jsonb
      ) AS items
    FROM public.people_addresses pa
    WHERE pa.user_id = p_user_id
      AND pa.person_id = ANY(p_person_ids)
    GROUP BY pa.person_id
  ),
  socials AS (
    SELECT
      ps.person_id,
      MAX(ps.handle) FILTER (WHERE ps.platform = 'linkedin') AS linkedin,
      MAX(ps.handle) FILTER (WHERE ps.platform = 'instagram') AS instagram,
      MAX(ps.handle) FILTER (WHERE ps.platform = 'whatsapp') AS whatsapp,
      MAX(ps.handle) FILTER (WHERE ps.platform = 'facebook') AS facebook,
      MAX(ps.handle) FILTER (WHERE ps.platform = 'website') AS website,
      MAX(ps.handle) FILTER (WHERE ps.platform = 'signal') AS signal
    FROM public.people_socials ps
    WHERE ps.user_id = p_user_id
      AND ps.person_id = ANY(p_person_ids)
    GROUP BY ps.person_id
  )
  SELECT COALESCE(
    jsonb_object_agg(
      i.person_id::text,
      jsonb_build_object(
        'phones', COALESCE(p.items, '[]'::jsonb),
        'emails', COALESCE(e.items, '[]'::jsonb),
        'addresses', COALESCE(a.items, '[]'::jsonb),
        'linkedin', soc.linkedin,
        'instagram', soc.instagram,
        'whatsapp', soc.whatsapp,
        'facebook', soc.facebook,
        'website', soc.website,
        'signal', soc.signal
      )
    ),
    '{}'::jsonb
  )
  INTO result
  FROM ids i
  LEFT JOIN phones p ON p.person_id = i.person_id
  LEFT JOIN emails e ON e.person_id = i.person_id
  LEFT JOIN addresses a ON a.person_id = i.person_id
  LEFT JOIN socials soc ON soc.person_id = i.person_id;

  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

COMMENT ON FUNCTION public.get_contact_extras(uuid, uuid[]) IS
  'Returns contact extras keyed by person_id (JSON shape v1). Used by API list enrichment.';
