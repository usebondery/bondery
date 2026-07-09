import type { RelationshipType } from "@bondery/schemas";
import { internal } from "../../lib/platform/errors/http-errors.js";
import { type DomainContext, DomainError } from "../_shared/context.js";

const RELATIONSHIP_SELECT = `
  id,
  user_id,
  source_person_id,
  target_person_id,
  relationship_type,
  created_at,
  updated_at
`;

function toRelationshipRow(row: {
  id: string;
  user_id: string;
  source_person_id: string;
  target_person_id: string;
  relationship_type: string;
  created_at: string;
  updated_at: string;
}) {
  return {
    createdAt: row.created_at,
    id: row.id,
    relationshipType: row.relationship_type as RelationshipType,
    sourcePersonId: row.source_person_id,
    targetPersonId: row.target_person_id,
    updatedAt: row.updated_at,
    userId: row.user_id,
  };
}

async function assertBothContactsExist(ctx: DomainContext, personIds: string[]): Promise<void> {
  const { client, user } = ctx;
  const { data: peopleRows, error: peopleError } = await client
    .from("people")
    .select("id")
    .in("id", personIds)
    .eq("user_id", user.id);

  if (peopleError) {
    throw internal("relationship_failed", peopleError.message);
  }
  if (!peopleRows || peopleRows.length !== personIds.length) {
    throw new DomainError("One or both contacts were not found", 404, "contact_not_found");
  }
}

export async function createRelationship(
  ctx: DomainContext,
  sourcePersonId: string,
  relatedPersonId: string,
  relationshipType: RelationshipType,
): Promise<{ data: { relationship: ReturnType<typeof toRelationshipRow> } }> {
  const normalizedRelatedPersonId = relatedPersonId.trim();

  if (sourcePersonId === normalizedRelatedPersonId) {
    throw new DomainError(
      "A contact cannot be related to itself",
      400,
      "relationship_self_forbidden",
    );
  }

  await assertBothContactsExist(ctx, [sourcePersonId, normalizedRelatedPersonId]);

  const { client, user } = ctx;
  const { data: insertedRelationship, error: insertError } = await client
    .from("people_relationships")
    .insert({
      relationship_type: relationshipType,
      source_person_id: sourcePersonId,
      target_person_id: normalizedRelatedPersonId,
      user_id: user.id,
    })
    .select(RELATIONSHIP_SELECT)
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      throw new DomainError("Relationship already exists", 409, "relationship_already_exists");
    }
    if (insertError.code === "23514") {
      throw new DomainError("Invalid relationship data", 400, "relationship_invalid");
    }
    throw internal("relationship_failed", insertError.message);
  }

  return { data: { relationship: toRelationshipRow(insertedRelationship) } };
}

export async function updateRelationship(
  ctx: DomainContext,
  personId: string,
  relationshipId: string,
  relatedPersonId: string,
  relationshipType: RelationshipType,
): Promise<{ data: { relationship: ReturnType<typeof toRelationshipRow> } }> {
  const normalizedRelatedPersonId = relatedPersonId.trim();

  if (personId === normalizedRelatedPersonId) {
    throw new DomainError(
      "A contact cannot be related to itself",
      400,
      "relationship_self_forbidden",
    );
  }

  const { client, user } = ctx;

  const { data: existingRelationship, error: existingRelationshipError } = await client
    .from("people_relationships")
    .select("id, source_person_id, target_person_id")
    .eq("id", relationshipId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingRelationshipError) {
    throw internal("relationship_failed", existingRelationshipError.message);
  }
  if (!existingRelationship) {
    throw new DomainError("Relationship not found", 404, "relationship_not_found");
  }

  if (
    existingRelationship.source_person_id !== personId &&
    existingRelationship.target_person_id !== personId
  ) {
    throw new DomainError("Relationship not found", 404, "relationship_not_found");
  }

  await assertBothContactsExist(ctx, [personId, normalizedRelatedPersonId]);

  const { data: updatedRelationship, error: updateError } = await client
    .from("people_relationships")
    .update({
      relationship_type: relationshipType,
      source_person_id: personId,
      target_person_id: normalizedRelatedPersonId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", relationshipId)
    .eq("user_id", user.id)
    .select(RELATIONSHIP_SELECT)
    .single();

  if (updateError) {
    if (updateError.code === "23505") {
      throw new DomainError("Relationship already exists", 409, "relationship_already_exists");
    }
    if (updateError.code === "23514") {
      throw new DomainError("Invalid relationship data", 400, "relationship_invalid");
    }
    throw internal("relationship_failed", updateError.message);
  }

  return { data: { relationship: toRelationshipRow(updatedRelationship) } };
}

export async function deleteRelationship(
  ctx: DomainContext,
  personId: string,
  relationshipId: string,
): Promise<{ data: { deletedId: string } }> {
  const { client, user } = ctx;

  const { data: existingRelationship, error: existingRelationshipError } = await client
    .from("people_relationships")
    .select("id, source_person_id, target_person_id")
    .eq("id", relationshipId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingRelationshipError) {
    throw internal("relationship_failed", existingRelationshipError.message);
  }
  if (!existingRelationship) {
    throw new DomainError("Relationship not found", 404, "relationship_not_found");
  }

  if (
    existingRelationship.source_person_id !== personId &&
    existingRelationship.target_person_id !== personId
  ) {
    throw new DomainError("Relationship not found", 404, "relationship_not_found");
  }

  const { data: deletedRelationship, error: deleteError } = await client
    .from("people_relationships")
    .delete()
    .eq("id", relationshipId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (deleteError || !deletedRelationship) {
    throw new DomainError("Relationship not found", 404, "relationship_not_found");
  }

  return { data: { deletedId: relationshipId } };
}
