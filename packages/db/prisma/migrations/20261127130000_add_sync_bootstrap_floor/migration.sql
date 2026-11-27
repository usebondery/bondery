-- Let the API tell a mobile client to bootstrap again.
--
-- `sync_user_sequence.bootstrap_floor` is the lowest cursor a client may pull from.
-- `GET /sync/pull` answers `requiresBootstrap: true` when the client cursor is below it.

-- AlterTable
ALTER TABLE "sync_user_sequence" ADD COLUMN     "bootstrap_floor" BIGINT NOT NULL DEFAULT 0;

-- Heal mobile caches once.
--
-- Until this release, several write paths changed synced tables without writing
-- `sync_change_log` (LinkedIn enrichment, vCard, LinkedIn and Instagram imports, extension
-- photo updates, default import groups, and the new-account profile). A phone that had finished
-- its bootstrap never received those rows, so its local copy lacks them. The log holds no entry
-- to replay, so the only repair is a full bootstrap.
--
-- A client that is fully caught up holds a cursor equal to the head, so a floor equal to the
-- old head would not reach it, and those are exactly the clients that miss the rows. So the
-- update moves every head forward by one empty sequence and sets the floor to the new head.
-- Every existing cursor is then below the floor, and each existing client bootstraps exactly
-- once on its next pull, with no app update. The bootstrap answers the new head, which equals
-- the floor, so the client does not bootstrap again. A sequence with no log rows is harmless:
-- a pull returns rows after its cursor, and an empty number has none.
--
-- A user with data and no sequence row has never written a log entry, so every row they own
-- came through a path that skipped the log. Give that user the sequence row first. The floor
-- may never exceed the head, or a client would bootstrap in a loop: after a bootstrap it
-- continues from the head, and that cursor must not be below the floor.
INSERT INTO "sync_user_sequence" ("user_id", "last_sequence", "bootstrap_floor")
SELECT DISTINCT p."user_id", 1, 1
FROM "people" AS p
WHERE NOT EXISTS (
  SELECT 1 FROM "sync_user_sequence" AS s WHERE s."user_id" = p."user_id"
)
ON CONFLICT ("user_id") DO NOTHING;

UPDATE "sync_user_sequence"
SET "last_sequence" = "last_sequence" + 1,
    "bootstrap_floor" = "last_sequence" + 1;
