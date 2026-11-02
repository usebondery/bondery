-- CreateIndex
CREATE INDEX "people_relationships_user_id_source_person_id_idx" ON "people_relationships"("user_id", "source_person_id");

-- CreateIndex
CREATE INDEX "people_relationships_user_id_target_person_id_idx" ON "people_relationships"("user_id", "target_person_id");
