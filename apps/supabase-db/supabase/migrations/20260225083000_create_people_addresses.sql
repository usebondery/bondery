-- Normalize contact addresses into a dedicated table with typed entries.
-- Supports up to 3 addresses per person via fixed types: home, work, other.

CREATE TABLE IF NOT EXISTS public.people_addresses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  person_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'home',
  value text NOT NULL,
  latitude double precision,
  longitude double precision,
  address_line1 text,
  address_line2 text,
  address_city text,
  address_postal_code text,
  address_state text,
  address_state_code text,
  address_country text,
  address_country_code char(2),
  address_granularity text NOT NULL DEFAULT 'address',
  address_formatted text,
  address_geocode_source text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT people_addresses_pkey PRIMARY KEY (id),
  CONSTRAINT people_addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT people_addresses_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE,
  CONSTRAINT people_addresses_type_check CHECK (type IN ('home', 'work', 'other')),
  CONSTRAINT people_addresses_granularity_check CHECK (address_granularity IN ('address', 'city', 'state', 'country')),
  CONSTRAINT people_addresses_sort_order_check CHECK (sort_order >= 0),
  CONSTRAINT people_addresses_value_nonempty_check CHECK (length(trim(value)) > 0),
  CONSTRAINT people_addresses_unique_type_per_person UNIQUE (person_id, type)
);

CREATE INDEX IF NOT EXISTS people_addresses_user_id_idx
  ON public.people_addresses(user_id);

CREATE INDEX IF NOT EXISTS people_addresses_person_id_idx
  ON public.people_addresses(person_id);

CREATE INDEX IF NOT EXISTS people_addresses_person_sort_idx
  ON public.people_addresses(person_id, sort_order, created_at);

ALTER TABLE public.people_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own people addresses"
  ON public.people_addresses
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own people addresses"
  ON public.people_addresses
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.people person
      WHERE person.id = person_id
        AND person.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own people addresses"
  ON public.people_addresses
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.people person
      WHERE person.id = person_id
        AND person.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own people addresses"
  ON public.people_addresses
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER people_addresses_updated_at
  BEFORE UPDATE ON public.people_addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Backfill existing singular address columns to a single 'home' entry.
INSERT INTO public.people_addresses (
  user_id,
  person_id,
  type,
  value,
  latitude,
  longitude,
  address_line1,
  address_line2,
  address_city,
  address_postal_code,
  address_state,
  address_state_code,
  address_country,
  address_country_code,
  address_granularity,
  address_formatted,
  address_geocode_source,
  sort_order
)
SELECT
  p.user_id,
  p.id,
  'home',
  COALESCE(
    NULLIF(trim(p.address_formatted), ''),
    NULLIF(trim(p.address_line1), ''),
    NULLIF(trim(p.place), '')
  ) AS value,
  p.latitude,
  p.longitude,
  p.address_line1,
  p.address_line2,
  p.address_city,
  p.address_postal_code,
  p.address_state,
  p.address_state_code,
  p.address_country,
  p.address_country_code,
  p.address_granularity,
  p.address_formatted,
  p.address_geocode_source,
  0
FROM public.people p
WHERE COALESCE(
  NULLIF(trim(p.address_formatted), ''),
  NULLIF(trim(p.address_line1), ''),
  NULLIF(trim(p.place), '')
) IS NOT NULL
ON CONFLICT (person_id, type) DO NOTHING;
