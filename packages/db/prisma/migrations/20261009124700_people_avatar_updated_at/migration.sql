-- Photo cache-bust / mobile download clock. Independent of people.updated_at
-- so notes and identity edits do not invalidate avatars.

ALTER TABLE "people" ADD COLUMN "avatar_updated_at" TIMESTAMP(3);

UPDATE "people" SET "avatar_updated_at" = "updated_at" WHERE "has_avatar" = true;
