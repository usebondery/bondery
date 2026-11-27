-- Persist the CardDAV rebuild cursor and index the child-delete lookup.
--
-- A rebuild (first build or a new projection version) now survives across requests. While one
-- runs, `rebuild_head` holds the head sequence read before the first person and
-- `rebuild_after_person_id` holds the last person folded in. Both are NULL otherwise.

-- AlterTable
ALTER TABLE "carddav_address_books" ADD COLUMN     "rebuild_head" BIGINT,
ADD COLUMN     "rebuild_after_person_id" UUID;

-- CreateIndex
-- The reconciler resolves the person of a child delete (no row data) from the latest earlier log
-- row of the same entity.
CREATE INDEX "sync_change_log_entity_lookup_idx" ON "sync_change_log"("user_id", "table_name", "entity_id", "server_sequence" DESC);
