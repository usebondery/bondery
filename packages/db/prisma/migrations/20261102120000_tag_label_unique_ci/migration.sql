-- Tag labels are unique per user, ignoring letter case.
--
-- Prisma cannot declare a functional index, so the index lives in SQL only.
-- This migration merges existing duplicates first, then creates the index.
-- Every statement keeps the oldest tag per (user_id, lower(label)) group and
-- orders ties by id, so each statement picks the same survivor.

-- Step 1: delete people_tags rows that the merge cannot keep.
-- A row goes away when the survivor tag already has that person, or when the
-- person has more than one row that would move to the survivor tag.
with ranked_tags as (
  select
    id,
    first_value(id) over (
      partition by user_id, lower(label)
      order by created_at asc, id asc
    ) as survivor_id
  from tags
),
duplicates as (
  select id as loser_id, survivor_id
  from ranked_tags
  where id <> survivor_id
),
candidates as (
  select
    pt.id as people_tag_id,
    pt.person_id,
    d.survivor_id,
    pt.created_at,
    exists (
      select 1
      from people_tags existing
      where existing.person_id = pt.person_id
        and existing.tag_id = d.survivor_id
    ) as survivor_row_exists
  from people_tags pt
  join duplicates d on d.loser_id = pt.tag_id
),
numbered as (
  select
    candidate.people_tag_id,
    candidate.survivor_row_exists,
    row_number() over (
      partition by candidate.person_id, candidate.survivor_id
      order by candidate.created_at asc, candidate.people_tag_id asc
    ) as position
  from candidates candidate
)
delete from people_tags pt
using numbered n
where pt.id = n.people_tag_id
  and (n.survivor_row_exists or n.position > 1);

-- Step 2: move the remaining memberships to the survivor tag.
with ranked_tags as (
  select
    id,
    first_value(id) over (
      partition by user_id, lower(label)
      order by created_at asc, id asc
    ) as survivor_id
  from tags
),
duplicates as (
  select id as loser_id, survivor_id
  from ranked_tags
  where id <> survivor_id
)
update people_tags pt
set tag_id = d.survivor_id
from duplicates d
where pt.tag_id = d.loser_id;

-- Step 3: delete the duplicate tags.
with ranked_tags as (
  select
    id,
    first_value(id) over (
      partition by user_id, lower(label)
      order by created_at asc, id asc
    ) as survivor_id
  from tags
),
duplicates as (
  select id as loser_id
  from ranked_tags
  where id <> survivor_id
)
delete from tags t
using duplicates d
where t.id = d.loser_id;

-- Step 4: enforce one label per user, ignoring letter case.
CREATE UNIQUE INDEX "tags_user_id_label_lower_key" ON "tags" ("user_id", lower("label"));
