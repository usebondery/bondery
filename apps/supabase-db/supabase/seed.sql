-- Sample seed data for local development.
--
-- This file is picked up automatically by `npx supabase db reset`.
-- It creates one sample auth user and richer related rows in public tables.
--
-- Important:
-- - This script does NOT update/insert public.user_settings directly.
-- - user_settings is created by the auth signup trigger.

BEGIN;

DO $$
DECLARE
  seed_user_id uuid := '11111111-1111-1111-1111-111111111111';
  person_ada_id uuid := '22222222-2222-2222-2222-222222222222';
  person_grace_id uuid := '33333333-3333-3333-3333-333333333333';
  person_katherine_id uuid := '12121212-1212-1212-1212-121212121212';
  person_turing_id uuid := '13131313-1313-1313-1313-131313131313';
  group_family_id uuid := '66666666-6666-6666-6666-666666666666';
  group_work_id uuid := '77777777-7777-7777-7777-777777777777';
  group_friends_id uuid := '78787878-7878-7878-7878-787878787878';
  activity_coffee_id uuid := '88888888-8888-8888-8888-888888888888';
  activity_meeting_id uuid := '99999999-9999-9999-9999-999999999999';
  activity_walk_id uuid := '98989898-9898-9898-9898-989898989898';
  activity_lunch_id uuid := '97979797-9797-9797-9797-979797979797';
  activity_hackathon_id uuid := '96969696-9696-9696-9696-969696969696';
BEGIN
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    seed_user_id,
    'authenticated',
    'authenticated',
    'seed@usebondery.local',
    crypt('seed-password', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"given_name":"Seed","family_name":"User"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    created_at,
    updated_at
  )
  VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    seed_user_id,
    jsonb_build_object('sub', seed_user_id::text, 'email', 'seed@usebondery.local'),
    'email',
    seed_user_id::text,
    now(),
    now()
  )
  ON CONFLICT (provider, provider_id) DO NOTHING;

  INSERT INTO public.people (
    id,
    user_id,
    title,
    first_name,
    middle_name,
    last_name,
    avatar,
    last_interaction,
    connections,
    myself,
    position,
    gender,
    language,
    timezone,
    nickname,
    pgp_public_key,
    location,
    place,
    description,
    notes,
    created_at,
    updated_at
  )
  VALUES
    (
      person_ada_id,
      seed_user_id,
      'Dr.',
      'Ada',
      'Byron',
      'Lovelace',
      '/avatars/11111111-1111-1111-1111-111111111111/ada.jpg',
      '2026-02-10T09:15:00+00',
      ARRAY['met_at_conference', 'mentoring'],
      false,
      '{"company":"Analytical Engines Ltd","role":"Mathematician"}'::jsonb,
      'female',
      'en',
      'Europe/London',
      'Countess of Lovelace',
      '-----BEGIN PGP PUBLIC KEY BLOCK-----\nSEED-ADA\n-----END PGP PUBLIC KEY BLOCK-----',
      extensions.ST_GeogFromText('POINT(-0.1278 51.5074)'),
      'London',
      'Early computing pioneer',
      'Sample seeded contact with rich profile data',
      '2026-01-15T11:00:00+00',
      '2026-02-18T10:00:00+00'
    ),
    (
      person_grace_id,
      seed_user_id,
      'Rear Admiral',
      'Grace',
      'B.',
      'Hopper',
      '/avatars/11111111-1111-1111-1111-111111111111/grace.jpg',
      '2026-02-12T14:40:00+00',
      ARRAY['navy', 'compiler-history'],
      false,
      '{"company":"US Navy","role":"Computer Scientist"}'::jsonb,
      'female',
      'en',
      'America/New_York',
      'Amazing Grace',
      '-----BEGIN PGP PUBLIC KEY BLOCK-----\nSEED-GRACE\n-----END PGP PUBLIC KEY BLOCK-----',
      extensions.ST_GeogFromText('POINT(-74.0060 40.7128)'),
      'New York',
      'Invented one of the first compilers',
      'Sample seeded contact with rich profile data',
      '2026-01-20T13:30:00+00',
      '2026-02-18T10:05:00+00'
    ),
    (
      person_katherine_id,
      seed_user_id,
      'Ms.',
      'Katherine',
      NULL,
      'Johnson',
      '/avatars/11111111-1111-1111-1111-111111111111/katherine.jpg',
      '2026-02-14T16:20:00+00',
      ARRAY['nasa', 'apollo-program'],
      false,
      '{"company":"NASA","role":"Mathematician"}'::jsonb,
      'female',
      'en',
      'America/New_York',
      'Kay',
      '-----BEGIN PGP PUBLIC KEY BLOCK-----\nSEED-KATHERINE\n-----END PGP PUBLIC KEY BLOCK-----',
      extensions.ST_GeogFromText('POINT(-77.4605 37.5407)'),
      'Richmond',
      'Orbital mechanics specialist',
      'Prefers morning check-ins and concise notes',
      '2026-01-25T10:10:00+00',
      '2026-02-18T10:10:00+00'
    ),
    (
      person_turing_id,
      seed_user_id,
      NULL,
      'Alan',
      'M.',
      'Turing',
      '/avatars/11111111-1111-1111-1111-111111111111/alan.jpg',
      '2026-02-16T08:45:00+00',
      ARRAY['cryptography', 'ai-research'],
      false,
      '{"company":"Bletchley Labs","role":"Researcher"}'::jsonb,
      'male',
      'en',
      'Europe/London',
      'Al',
      '-----BEGIN PGP PUBLIC KEY BLOCK-----\nSEED-TURING\n-----END PGP PUBLIC KEY BLOCK-----',
      extensions.ST_GeogFromText('POINT(-1.2577 51.7520)'),
      'Oxford',
      'Computing theorist and cryptanalyst',
      'Interested in AI safety updates',
      '2026-01-28T09:00:00+00',
      '2026-02-18T10:20:00+00'
    )
  ON CONFLICT (id) DO UPDATE
  SET
    user_id = EXCLUDED.user_id,
    title = EXCLUDED.title,
    first_name = EXCLUDED.first_name,
    middle_name = EXCLUDED.middle_name,
    last_name = EXCLUDED.last_name,
    avatar = EXCLUDED.avatar,
    last_interaction = EXCLUDED.last_interaction,
    connections = EXCLUDED.connections,
    myself = EXCLUDED.myself,
    position = EXCLUDED.position,
    gender = EXCLUDED.gender,
    language = EXCLUDED.language,
    timezone = EXCLUDED.timezone,
    nickname = EXCLUDED.nickname,
    pgp_public_key = EXCLUDED.pgp_public_key,
    location = EXCLUDED.location,
    place = EXCLUDED.place,
    description = EXCLUDED.description,
    notes = EXCLUDED.notes,
    created_at = EXCLUDED.created_at,
    updated_at = EXCLUDED.updated_at;

  INSERT INTO public.groups (
    id,
    user_id,
    label,
    emoji,
    color,
    created_at,
    updated_at
  )
  VALUES
    (
      group_family_id,
      seed_user_id,
      'Family',
      '👨‍👩‍👧‍👦',
      '#F97316',
      '2026-01-15T11:05:00+00',
      '2026-02-01T10:00:00+00'
    ),
    (
      group_work_id,
      seed_user_id,
      'Work',
      '💼',
      '#10B981',
      '2026-01-15T11:05:00+00',
      '2026-02-01T10:00:00+00'
    ),
    (
      group_friends_id,
      seed_user_id,
      'Friends',
      '🧑‍🤝‍🧑',
      '#6366F1',
      '2026-01-18T09:10:00+00',
      '2026-02-01T10:10:00+00'
    )
  ON CONFLICT (id) DO UPDATE
  SET
    user_id = EXCLUDED.user_id,
    label = EXCLUDED.label,
    emoji = EXCLUDED.emoji,
    color = EXCLUDED.color,
    created_at = EXCLUDED.created_at,
    updated_at = EXCLUDED.updated_at;

  INSERT INTO public.people_groups (
    id,
    person_id,
    group_id,
    user_id,
    created_at
  )
  VALUES
    (
      'aaaaaaaa-1111-1111-1111-111111111111',
      person_ada_id,
      group_family_id,
      seed_user_id,
      '2026-01-16T08:00:00+00'
    ),
    (
      'bbbbbbbb-2222-2222-2222-222222222222',
      person_grace_id,
      group_work_id,
      seed_user_id,
      '2026-01-16T08:05:00+00'
    ),
    (
      'bcbcbcbc-2323-2323-2323-232323232323',
      person_katherine_id,
      group_work_id,
      seed_user_id,
      '2026-01-26T08:00:00+00'
    ),
    (
      'cacacaca-2424-2424-2424-242424242424',
      person_turing_id,
      group_friends_id,
      seed_user_id,
      '2026-01-29T08:15:00+00'
    )
  ON CONFLICT (id) DO UPDATE
  SET
    person_id = EXCLUDED.person_id,
    group_id = EXCLUDED.group_id,
    user_id = EXCLUDED.user_id,
    created_at = EXCLUDED.created_at;

  INSERT INTO public.people_phones (
    id,
    user_id,
    person_id,
    prefix,
    value,
    type,
    preferred,
    sort_order,
    created_at,
    updated_at
  )
  VALUES
    (
      'cccccccc-3333-3333-3333-333333333333',
      seed_user_id,
      person_ada_id,
      '+44',
      '7700900123',
      'home',
      true,
      0,
      '2026-01-15T11:10:00+00',
      '2026-02-01T11:00:00+00'
    ),
    (
      'dddddddd-4444-4444-4444-444444444444',
      seed_user_id,
      person_grace_id,
      '+1',
      '2125550199',
      'work',
      false,
      1,
      '2026-01-15T11:11:00+00',
      '2026-02-01T11:01:00+00'
    ),
    (
      'cdcdcdcd-2525-2525-2525-252525252525',
      seed_user_id,
      person_katherine_id,
      '+1',
      '8045550102',
      'work',
      true,
      0,
      '2026-01-25T10:15:00+00',
      '2026-02-01T11:11:00+00'
    ),
    (
      'cececece-2626-2626-2626-262626262626',
      seed_user_id,
      person_turing_id,
      '+44',
      '7900123456',
      'home',
      false,
      0,
      '2026-01-28T09:05:00+00',
      '2026-02-01T11:12:00+00'
    )
  ON CONFLICT (id) DO UPDATE
  SET
    user_id = EXCLUDED.user_id,
    person_id = EXCLUDED.person_id,
    prefix = EXCLUDED.prefix,
    value = EXCLUDED.value,
    type = EXCLUDED.type,
    preferred = EXCLUDED.preferred,
    sort_order = EXCLUDED.sort_order,
    created_at = EXCLUDED.created_at,
    updated_at = EXCLUDED.updated_at;

  INSERT INTO public.people_emails (
    id,
    user_id,
    person_id,
    value,
    type,
    preferred,
    sort_order,
    created_at,
    updated_at
  )
  VALUES
    (
      'eeeeeeee-5555-5555-5555-555555555555',
      seed_user_id,
      person_ada_id,
      'ada@analytical-engines.example',
      'work',
      true,
      0,
      '2026-01-15T11:12:00+00',
      '2026-02-01T11:02:00+00'
    ),
    (
      'ffffffff-6666-6666-6666-666666666666',
      seed_user_id,
      person_grace_id,
      'grace@navy.example',
      'work',
      true,
      0,
      '2026-01-15T11:13:00+00',
      '2026-02-01T11:03:00+00'
    ),
    (
      'f1f1f1f1-2727-2727-2727-272727272727',
      seed_user_id,
      person_katherine_id,
      'katherine@nasa.example',
      'work',
      true,
      0,
      '2026-01-25T10:18:00+00',
      '2026-02-01T11:13:00+00'
    ),
    (
      'f2f2f2f2-2828-2828-2828-282828282828',
      seed_user_id,
      person_turing_id,
      'alan@bletchley.example',
      'work',
      true,
      0,
      '2026-01-28T09:08:00+00',
      '2026-02-01T11:14:00+00'
    )
  ON CONFLICT (id) DO UPDATE
  SET
    user_id = EXCLUDED.user_id,
    person_id = EXCLUDED.person_id,
    value = EXCLUDED.value,
    type = EXCLUDED.type,
    preferred = EXCLUDED.preferred,
    sort_order = EXCLUDED.sort_order,
    created_at = EXCLUDED.created_at,
    updated_at = EXCLUDED.updated_at;

  INSERT INTO public.people_social_media (
    id,
    user_id,
    person_id,
    platform,
    handle,
    connected_at,
    created_at,
    updated_at
  )
  VALUES
    (
      '10101010-7777-7777-7777-777777777777',
      seed_user_id,
      person_ada_id,
      'linkedin',
      'ada-lovelace',
      '2026-01-10T09:00:00+00',
      '2026-01-15T11:14:00+00',
      '2026-02-01T11:04:00+00'
    ),
    (
      '20202020-8888-8888-8888-888888888888',
      seed_user_id,
      person_grace_id,
      'website',
      'https://gracehopper.example',
      '2026-01-11T09:00:00+00',
      '2026-01-15T11:15:00+00',
      '2026-02-01T11:05:00+00'
    ),
    (
      '21212121-8989-8989-8989-898989898989',
      seed_user_id,
      person_katherine_id,
      'linkedin',
      'katherine-johnson',
      '2026-01-25T10:20:00+00',
      '2026-01-25T10:20:00+00',
      '2026-02-01T11:15:00+00'
    ),
    (
      '22222222-9090-9090-9090-909090909090',
      seed_user_id,
      person_turing_id,
      'website',
      'https://turing.example',
      '2026-01-28T09:10:00+00',
      '2026-01-28T09:10:00+00',
      '2026-02-01T11:16:00+00'
    )
  ON CONFLICT (id) DO UPDATE
  SET
    user_id = EXCLUDED.user_id,
    person_id = EXCLUDED.person_id,
    platform = EXCLUDED.platform,
    handle = EXCLUDED.handle,
    connected_at = EXCLUDED.connected_at,
    created_at = EXCLUDED.created_at,
    updated_at = EXCLUDED.updated_at;

  INSERT INTO public.people_relationships (
    id,
    user_id,
    source_person_id,
    target_person_id,
    relationship_type,
    created_at,
    updated_at
  )
  VALUES
    (
      '30303030-9999-9999-9999-999999999999',
      seed_user_id,
      person_ada_id,
      person_grace_id,
      'colleague',
      '2026-01-17T12:00:00+00',
      '2026-02-01T11:06:00+00'
    ),
    (
      '31313131-9191-9191-9191-919191919191',
      seed_user_id,
      person_katherine_id,
      person_grace_id,
      'colleague',
      '2026-01-27T12:00:00+00',
      '2026-02-01T11:17:00+00'
    ),
    (
      '32323232-9292-9292-9292-929292929292',
      seed_user_id,
      person_turing_id,
      person_ada_id,
      'friend',
      '2026-01-30T12:00:00+00',
      '2026-02-01T11:18:00+00'
    )
  ON CONFLICT (id) DO UPDATE
  SET
    user_id = EXCLUDED.user_id,
    source_person_id = EXCLUDED.source_person_id,
    target_person_id = EXCLUDED.target_person_id,
    relationship_type = EXCLUDED.relationship_type,
    created_at = EXCLUDED.created_at,
    updated_at = EXCLUDED.updated_at;

  INSERT INTO public.people_important_events (
    id,
    user_id,
    person_id,
    event_type,
    event_date,
    notify_days_before,
    note,
    created_at,
    updated_at
  )
  VALUES
    (
      '44444444-4444-4444-4444-444444444444',
      seed_user_id,
      person_ada_id,
      'birthday',
      DATE '1990-06-15',
      7,
      'Buy flowers',
      '2026-01-20T08:00:00+00',
      '2026-02-01T11:07:00+00'
    ),
    (
      '55555555-5555-5555-5555-555555555555',
      seed_user_id,
      person_grace_id,
      'anniversary',
      DATE '2015-09-10',
      3,
      'Plan dinner',
      '2026-01-20T08:05:00+00',
      '2026-02-01T11:08:00+00'
    ),
    (
      '56565656-5656-5656-5656-565656565656',
      seed_user_id,
      person_katherine_id,
      'graduation',
      DATE '2026-03-03',
      7,
      'Send congratulations card',
      '2026-01-25T08:00:00+00',
      '2026-02-01T11:19:00+00'
    ),
    (
      '57575757-5757-5757-5757-575757575757',
      seed_user_id,
      person_turing_id,
      'birthday',
      DATE '1912-06-23',
      1,
      'Book lunch reservation',
      '2026-01-28T08:00:00+00',
      '2026-02-01T11:20:00+00'
    )
  ON CONFLICT (id) DO UPDATE
  SET
    user_id = EXCLUDED.user_id,
    person_id = EXCLUDED.person_id,
    event_type = EXCLUDED.event_type,
    event_date = EXCLUDED.event_date,
    notify_days_before = EXCLUDED.notify_days_before,
    note = EXCLUDED.note,
    created_at = EXCLUDED.created_at,
    updated_at = EXCLUDED.updated_at;

  INSERT INTO public.events (
    id,
    user_id,
    type,
    title,
    description,
    date,
    created_at,
    updated_at
  )
  VALUES
    (
      activity_coffee_id,
      seed_user_id,
      'Coffee',
      'Coffee catch-up',
      'Discussed project roadmap and upcoming birthday reminder flow',
      '2026-02-05T08:30:00+00',
      '2026-02-05T09:00:00+00',
      '2026-02-05T09:00:00+00'
    ),
    (
      activity_meeting_id,
      seed_user_id,
      'Meeting',
      'Reminder system review',
      'Reviewed timezone and send-hour behavior',
      '2026-02-07T15:00:00+00',
      '2026-02-07T15:30:00+00',
      '2026-02-07T15:30:00+00'
    ),
    (
      activity_walk_id,
      seed_user_id,
      'Other',
      'Weekend walk',
      'Quick catch-up during city walk and discussed travel plans',
      '2026-02-10T10:00:00+00',
      '2026-02-10T10:30:00+00',
      '2026-02-10T10:30:00+00'
    ),
    (
      activity_lunch_id,
      seed_user_id,
      'Meal',
      'Working lunch',
      'Aligned on upcoming roadmap and next networking event attendance',
      '2026-02-12T12:30:00+00',
      '2026-02-12T13:30:00+00',
      '2026-02-12T13:30:00+00'
    ),
    (
      activity_hackathon_id,
      seed_user_id,
      'Competition/Hackathon',
      'Prototype hackathon',
      'Built reminder digest prototype and reviewed follow-up actions',
      '2026-02-15T09:00:00+00',
      '2026-02-15T18:00:00+00',
      '2026-02-15T18:00:00+00'
    )
  ON CONFLICT (id) DO UPDATE
  SET
    user_id = EXCLUDED.user_id,
    type = EXCLUDED.type,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    date = EXCLUDED.date,
    created_at = EXCLUDED.created_at,
    updated_at = EXCLUDED.updated_at;

  INSERT INTO public.event_participants (
    event_id,
    person_id,
    created_at
  )
  VALUES
    (
      activity_coffee_id,
      person_ada_id,
      '2026-02-05T09:05:00+00'
    ),
    (
      activity_meeting_id,
      person_grace_id,
      '2026-02-07T15:35:00+00'
    ),
    (
      activity_walk_id,
      person_turing_id,
      '2026-02-10T10:32:00+00'
    ),
    (
      activity_lunch_id,
      person_katherine_id,
      '2026-02-12T13:35:00+00'
    ),
    (
      activity_lunch_id,
      person_grace_id,
      '2026-02-12T13:36:00+00'
    ),
    (
      activity_hackathon_id,
      person_ada_id,
      '2026-02-15T18:05:00+00'
    ),
    (
      activity_hackathon_id,
      person_turing_id,
      '2026-02-15T18:06:00+00'
    )
  ON CONFLICT (event_id, person_id) DO UPDATE
  SET
    created_at = EXCLUDED.created_at;

  INSERT INTO public.reminder_dispatch_log (
    id,
    user_id,
    reminder_date,
    timezone,
    created_at
  )
  VALUES (
    '40404040-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    seed_user_id,
    CURRENT_DATE - 1,
    'Europe/Berlin',
    now() - interval '1 day'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    user_id = EXCLUDED.user_id,
    reminder_date = EXCLUDED.reminder_date,
    timezone = EXCLUDED.timezone,
    created_at = EXCLUDED.created_at;
END;
$$;

COMMIT;
