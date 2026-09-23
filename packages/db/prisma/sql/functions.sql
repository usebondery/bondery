-- Bondery Postgres functions & extensions.
--
-- Scheduled jobs (hourly reminders, enrich-queue cleanup) run in the API via
-- pg-boss — not pg_cron. See apps/api/src/lib/jobs/.
--
-- Applied separately from Prisma migrations (see scripts/apply-sql-functions.ts).

create extension if not exists "uuid-ossp";
create extension if not exists pg_trgm;
create extension if not exists unaccent;
create extension if not exists postgis;

-- immutable wrapper so unaccent() can be used in a trigram index
create or replace function immutable_unaccent(text)
returns text
language sql
immutable
parallel safe
as $$
  select public.unaccent($1::text);
$$;

create index if not exists people_search_trgm_idx
  on people using gin (immutable_unaccent(first_name || ' ' || coalesce(last_name, '')) gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Search
-- ---------------------------------------------------------------------------

create or replace function search_people_ids(
  p_user_id uuid,
  p_query text,
  p_group_id uuid default null,
  p_tag_id uuid default null,
  p_keep_in_touch boolean default null,
  p_threshold real default 0.2,
  p_limit int default 50,
  p_offset int default 0
)
returns table (id uuid, rank real)
language sql
stable
as $$
  select p.id,
         similarity(immutable_unaccent(p.first_name || ' ' || coalesce(p.last_name, '')), immutable_unaccent(p_query)) as rank
  from people p
  where p.user_id = p_user_id
    and (p_group_id is null or exists (select 1 from people_groups pg where pg.person_id = p.id and pg.group_id = p_group_id))
    and (p_tag_id is null or exists (select 1 from people_tags pt where pt.person_id = p.id and pt.tag_id = p_tag_id))
    and (
      p_keep_in_touch is not true
      or (p.keep_frequency_days is not null
          and p.last_interaction is not null
          and p.last_interaction < now() - (p.keep_frequency_days || ' days')::interval)
    )
    and (
      p_query = ''
      or similarity(immutable_unaccent(p.first_name || ' ' || coalesce(p.last_name, '')), immutable_unaccent(p_query)) > p_threshold
    )
  order by rank desc, p.first_name asc
  limit p_limit offset p_offset;
$$;

create or replace function count_search_people_ids(
  p_user_id uuid,
  p_query text,
  p_group_id uuid default null,
  p_tag_id uuid default null,
  p_keep_in_touch boolean default null,
  p_threshold real default 0.2
)
returns int
language sql
stable
as $$
  select count(*)::int from search_people_ids(p_user_id, p_query, p_group_id, p_tag_id, p_keep_in_touch, p_threshold, 2147483647, 0);
$$;

-- ---------------------------------------------------------------------------
-- Map pins
-- ---------------------------------------------------------------------------

create or replace function get_map_pins_in_bbox(
  p_user_id uuid,
  p_min_lat double precision,
  p_min_lon double precision,
  p_max_lat double precision,
  p_max_lon double precision,
  p_limit int default 500
)
returns table (
  id uuid,
  first_name text,
  last_name text,
  headline text,
  has_avatar boolean,
  latitude double precision,
  longitude double precision,
  location text,
  last_interaction timestamptz,
  updated_at timestamptz
)
language sql
stable
as $$
  select p.id, p.first_name, p.last_name, p.headline, p.has_avatar,
         p.latitude, p.longitude, p.location, p.last_interaction, p.updated_at
  from people p
  where p.user_id = p_user_id
    and p.latitude between p_min_lat and p_max_lat
    and p.longitude between p_min_lon and p_max_lon
  limit p_limit;
$$;

create or replace function get_map_address_pins_in_bbox(
  p_user_id uuid,
  p_min_lat double precision,
  p_min_lon double precision,
  p_max_lat double precision,
  p_max_lon double precision,
  p_limit int default 500
)
returns table (
  address_id uuid,
  person_id uuid,
  first_name text,
  last_name text,
  has_avatar boolean,
  address_type text,
  address_city text,
  address_country text,
  address_formatted text,
  latitude double precision,
  longitude double precision,
  updated_at timestamptz
)
language sql
stable
as $$
  select a.id, p.id, p.first_name, p.last_name, p.has_avatar,
         a.type, a.address_city, a.address_country, a.address_formatted,
         a.latitude, a.longitude, a.updated_at
  from people_addresses a
  join people p on p.id = a.person_id
  where a.user_id = p_user_id
    and a.latitude between p_min_lat and p_max_lat
    and a.longitude between p_min_lon and p_max_lon
  limit p_limit;
$$;

create or replace function set_person_location(
  p_user_id uuid,
  p_person_id uuid,
  p_latitude double precision,
  p_longitude double precision
)
returns void
language sql
as $$
  update people
  set latitude = p_latitude,
      longitude = p_longitude,
      "gisPoint" = st_setsrid(st_makepoint(p_longitude, p_latitude), 4326),
      updated_at = now()
  where id = p_person_id and user_id = p_user_id;
$$;

-- ---------------------------------------------------------------------------
-- Sync sequence allocation (mobile pull/push sync)
-- ---------------------------------------------------------------------------

create or replace function allocate_sync_server_sequence(p_user_id uuid, p_count int default 1)
returns bigint
language plpgsql
as $$
declare
  v_next bigint;
begin
  insert into sync_user_sequence (user_id, last_sequence)
  values (p_user_id, p_count)
  on conflict (user_id) do update
    set last_sequence = sync_user_sequence.last_sequence + p_count
  returning last_sequence - p_count + 1 into v_next;
  return v_next;
end;
$$;

create or replace function bump_person_updated_at_for_sync(
  p_person_id uuid,
  p_user_id uuid
)
returns text
language plpgsql
as $$
begin
  update people
  set updated_at = now()
  where id = p_person_id and user_id = p_user_id;

  if not found then
    raise exception 'person not found';
  end if;

  return pg_current_xact_id()::text;
end;
$$;

create or replace function get_current_sync_txid()
returns bigint
language sql
stable
as $$
  select txid_current();
$$;

-- ---------------------------------------------------------------------------
-- AI chat quota
-- ---------------------------------------------------------------------------

create or replace function check_and_increment_ai_messages(
  p_user_id uuid,
  p_limit int,
  p_is_premium boolean
)
returns table (allowed boolean, messages_used int, reset_at timestamptz)
language plpgsql
as $$
declare
  v_row user_settings%rowtype;
begin
  select * into v_row from user_settings where user_id = p_user_id for update;

  if v_row.ai_messages_month_reset_at < now() then
    update user_settings
    set ai_messages_this_month = 0,
        ai_messages_month_reset_at = now() + interval '1 month'
    where user_id = p_user_id
    returning * into v_row;
  end if;

  if p_is_premium or v_row.ai_messages_this_month < p_limit then
    update user_settings
    set ai_messages_this_month = ai_messages_this_month + 1,
        ai_messages_used = ai_messages_used + 1
    where user_id = p_user_id
    returning * into v_row;

    -- user_settings.ai_messages_month_reset_at is TIMESTAMP (no time zone).
    -- RETURNS TABLE declares timestamptz; uncast RETURN QUERY fails with
    -- "structure of query does not match function result type".
    return query select true, v_row.ai_messages_this_month, v_row.ai_messages_month_reset_at::timestamptz;
  else
    return query select false, v_row.ai_messages_this_month, v_row.ai_messages_month_reset_at::timestamptz;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Keep-in-touch / enrichment helpers
-- ---------------------------------------------------------------------------

create or replace function get_keep_in_touch_overdue_count(p_user_id uuid)
returns int
language sql
stable
as $$
  select count(*)::int
  from people p
  where p.user_id = p_user_id
    and p.keep_frequency_days is not null
    and (p.last_interaction is null or p.last_interaction < now() - (p.keep_frequency_days || ' days')::interval);
$$;

create or replace function get_linkedin_enrich_eligible(p_user_id uuid, p_limit int default 25)
returns table (person_id uuid, first_name text, last_name text, handle text)
language sql
stable
as $$
  select p.id, p.first_name, p.last_name, s.handle
  from people p
  join people_socials s on s.person_id = p.id and s.platform = 'linkedin'
  left join linkedin_enrich_queue q on q.person_id = p.id and q.status in ('pending', 'processing')
  where p.user_id = p_user_id and q.id is null
  limit p_limit;
$$;

create or replace function get_linkedin_enrich_eligible_count(p_user_id uuid)
returns int
language sql
stable
as $$
  select count(*)::int from get_linkedin_enrich_eligible(p_user_id, 2147483647);
$$;

create or replace function cleanup_stale_enrich_queue()
returns int
language sql
as $$
  with deleted as (
    delete from linkedin_enrich_queue
    where
      (status = 'processing' and updated_at < now() - interval '1 day')
      or (status = 'failed' and updated_at < now() - interval '7 days')
      or (status = 'pending' and created_at < now() - interval '7 days')
    returning 1
  )
  select count(*)::int from deleted;
$$;

-- ---------------------------------------------------------------------------
-- Reminder scheduling (used by pg-boss dispatch in apps/api)
-- ---------------------------------------------------------------------------

drop function if exists compute_next_reminder_at_utc(text, time without time zone, timestamp with time zone);

create or replace function compute_next_reminder_at_utc(
  input_timezone text,
  input_send_hour text,
  base_ts timestamp with time zone default now()
)
returns timestamp with time zone
language plpgsql
stable
as $$
declare
  effective_timezone text;
  -- user_settings.reminder_send_hour is TEXT; triggers and $executeRaw pass text literals.
  effective_send_hour time without time zone := coalesce(
    nullif(trim(input_send_hour), '')::time,
    '08:00:00'::time
  );
  local_now timestamp without time zone;
  candidate_local timestamp without time zone;
  next_candidate timestamp with time zone;
begin
  select coalesce(tz.name, 'UTC')
  into effective_timezone
  from (select 1) seed
  left join lateral (
    select name
    from pg_timezone_names
    where name = input_timezone
    limit 1
  ) tz on true;

  local_now := timezone(effective_timezone, base_ts);
  candidate_local := date_trunc('day', local_now) + effective_send_hour;
  next_candidate := candidate_local at time zone effective_timezone;

  if next_candidate <= base_ts then
    next_candidate := (candidate_local + interval '1 day') at time zone effective_timezone;
  end if;

  return next_candidate;
end;
$$;

create or replace function set_user_settings_next_reminder_at_utc()
returns trigger
language plpgsql
as $$
begin
  new.next_reminder_at_utc := compute_next_reminder_at_utc(
    new.timezone,
    new.reminder_send_hour,
    now()
  );

  return new;
end;
$$;

drop trigger if exists user_settings_set_next_reminder_at_utc on user_settings;
create trigger user_settings_set_next_reminder_at_utc
  before insert or update of timezone, reminder_send_hour
  on user_settings
  for each row
  execute function set_user_settings_next_reminder_at_utc();

create or replace function replace_work_history(p_user_id uuid, p_people_linkedin_id uuid, p_rows jsonb)
returns void
language plpgsql
as $$
begin
  delete from people_work_history where people_linkedin_id = p_people_linkedin_id and user_id = p_user_id;
  insert into people_work_history (
    user_id, people_linkedin_id, company_name, company_linkedin_id, title,
    employment_type, location, description, start_date, end_date
  )
  select p_user_id, p_people_linkedin_id,
         r->>'company_name', r->>'company_linkedin_id', r->>'title',
         r->>'employment_type', r->>'location', r->>'description',
         (r->>'start_date')::date, (r->>'end_date')::date
  from jsonb_array_elements(p_rows) as r;
end;
$$;

create or replace function replace_education_history(p_user_id uuid, p_people_linkedin_id uuid, p_rows jsonb)
returns void
language plpgsql
as $$
begin
  delete from people_education_history where people_linkedin_id = p_people_linkedin_id and user_id = p_user_id;
  insert into people_education_history (
    user_id, people_linkedin_id, school_name, school_linkedin_id, degree,
    description, start_date, end_date
  )
  select p_user_id, p_people_linkedin_id,
         r->>'school_name', r->>'school_linkedin_id', r->>'degree',
         r->>'description', (r->>'start_date')::date, (r->>'end_date')::date
  from jsonb_array_elements(p_rows) as r;
end;
$$;

-- ---------------------------------------------------------------------------
-- Contact extras (batch list enrichment)
-- ---------------------------------------------------------------------------

create or replace function get_contact_extras(
  p_user_id uuid,
  p_person_ids uuid[]
)
returns jsonb
language plpgsql
stable
as $$
declare
  result jsonb;
begin
  if p_person_ids is null or cardinality(p_person_ids) = 0 then
    return '{}'::jsonb;
  end if;

  with ids as (
    select unnest(p_person_ids) as person_id
  ),
  phones as (
    select
      pp.person_id,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'preferred', pp.preferred,
            'prefix', pp.prefix,
            'type', case when pp.type = 'work' then 'work' else 'home' end,
            'value', pp.value
          )
          order by pp.sort_order asc, pp.created_at asc
        ),
        '[]'::jsonb
      ) as items
    from people_phones pp
    where pp.user_id = p_user_id
      and pp.person_id = any(p_person_ids)
    group by pp.person_id
  ),
  emails as (
    select
      pe.person_id,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'preferred', pe.preferred,
            'type', case when pe.type = 'work' then 'work' else 'home' end,
            'value', pe.value
          )
          order by pe.sort_order asc, pe.created_at asc
        ),
        '[]'::jsonb
      ) as items
    from people_emails pe
    where pe.user_id = p_user_id
      and pe.person_id = any(p_person_ids)
    group by pe.person_id
  ),
  addresses as (
    select
      pa.person_id,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'type', case
              when pa.type = 'work' then 'work'
              when pa.type = 'other' then 'other'
              else 'home'
            end,
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
            'addressGranularity', case
              when pa.address_granularity = 'city' then 'city'
              when pa.address_granularity = 'state' then 'state'
              when pa.address_granularity = 'country' then 'country'
              else 'address'
            end,
            'addressFormatted', pa.address_formatted,
            'addressGeocodeSource', pa.address_geocode_source,
            'geocodeConfidence', pa.geocode_confidence,
            'timezone', pa.timezone
          )
          order by pa.sort_order asc, pa.created_at asc
        ),
        '[]'::jsonb
      ) as items
    from people_addresses pa
    where pa.user_id = p_user_id
      and pa.person_id = any(p_person_ids)
    group by pa.person_id
  ),
  socials as (
    select
      ps.person_id,
      max(ps.handle) filter (where ps.platform = 'linkedin') as linkedin,
      max(ps.handle) filter (where ps.platform = 'instagram') as instagram,
      max(ps.handle) filter (where ps.platform = 'whatsapp') as whatsapp,
      max(ps.handle) filter (where ps.platform = 'facebook') as facebook,
      max(ps.handle) filter (where ps.platform = 'website') as website,
      max(ps.handle) filter (where ps.platform = 'signal') as signal
    from people_socials ps
    where ps.user_id = p_user_id
      and ps.person_id = any(p_person_ids)
    group by ps.person_id
  )
  select coalesce(
    jsonb_object_agg(
      i.person_id::text,
      jsonb_build_object(
        'phones', coalesce(p.items, '[]'::jsonb),
        'emails', coalesce(e.items, '[]'::jsonb),
        'addresses', coalesce(a.items, '[]'::jsonb),
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
  into result
  from ids i
  left join phones p on p.person_id = i.person_id
  left join emails e on e.person_id = i.person_id
  left join addresses a on a.person_id = i.person_id
  left join socials soc on soc.person_id = i.person_id;

  return coalesce(result, '{}'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------------
-- Removed admin KPI RPCs (dropped on release-migrate; no Prisma migration)
-- ---------------------------------------------------------------------------

drop function if exists get_funnel_periods();
drop function if exists get_total_users_growth();

