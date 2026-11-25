import type { RelationshipType } from "@bondery/schemas";
import { badRequest, conflict, internal } from "../../lib/platform/errors/http-errors.js";
import { type DomainContext, DomainError } from "../_shared/context.js";
import { domainDb } from "../_shared/domain-db.js";
import { isCheckViolation, isUniqueViolation, toSyncRow } from "../_shared/prisma-helpers.js";

function toRelationshipRow(row: {
  id: string;
  userId: string;
  sourcePersonId: string;
  targetPersonId: string;
  relationshipType: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  const sync = toSyncRow(row as unknown as Record<string, unknown>);
  return {
    createdAt: String(sync["created_at"]),
    id: String(sync["id"]),
    relationshipType: row.relationshipType as RelationshipType,
    sourcePersonId: String(sync["source_person_id"]),
    targetPersonId: String(sync["target_person_id"]),
    updatedAt: String(sync["updated_at"]),
    userId: String(sync["user_id"]),
  };
}

async function assertBothContactsExist(ctx: DomainContext, personIds: string[]): Promise<void> {
  const { user } = ctx;
  const db = domainDb(ctx);

  const peopleRows = await db.people.findMany({
    select: { id: true },
    where: { id: { in: personIds }, userId: user.id },
  });

  if (peopleRows.length !== personIds.length) {
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

  const { user } = ctx;
  const db = domainDb(ctx);

  try {
    const insertedRelationship = await db.peopleRelationship.create({
      data: {
        relationshipType,
        sourcePersonId,
        targetPersonId: normalizedRelatedPersonId,
        userId: user.id,
      },
    });

    return { data: { relationship: toRelationshipRow(insertedRelationship) } };
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict("Relationship already exists", "relationship_already_exists", error);
    }
    if (isCheckViolation(error)) {
      throw badRequest("Invalid relationship data", "relationship_invalid", error);
    }
    throw internal(
      "relationship_failed",
      error instanceof Error ? error.message : "relationship_failed",
    );
  }
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

  const { user } = ctx;
  const db = domainDb(ctx);

  const existingRelationship = await db.peopleRelationship.findFirst({
    select: { id: true, sourcePersonId: true, targetPersonId: true },
    where: { id: relationshipId, userId: user.id },
  });

  if (!existingRelationship) {
    throw new DomainError("Relationship not found", 404, "relationship_not_found");
  }

  if (
    existingRelationship.sourcePersonId !== personId &&
    existingRelationship.targetPersonId !== personId
  ) {
    throw new DomainError("Relationship not found", 404, "relationship_not_found");
  }

  await assertBothContactsExist(ctx, [personId, normalizedRelatedPersonId]);

  try {
    const updatedRelationship = await db.peopleRelationship.update({
      data: {
        relationshipType,
        sourcePersonId: personId,
        targetPersonId: normalizedRelatedPersonId,
        updatedAt: new Date(),
      },
      where: { id: relationshipId, userId: user.id },
    });

    return { data: { relationship: toRelationshipRow(updatedRelationship) } };
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict("Relationship already exists", "relationship_already_exists", error);
    }
    if (isCheckViolation(error)) {
      throw badRequest("Invalid relationship data", "relationship_invalid", error);
    }
    throw internal(
      "relationship_failed",
      error instanceof Error ? error.message : "relationship_failed",
    );
  }
}

export async function deleteRelationship(
  ctx: DomainContext,
  personId: string,
  relationshipId: string,
): Promise<{ data: { deletedId: string } }> {
  const { user } = ctx;
  const db = domainDb(ctx);

  const existingRelationship = await db.peopleRelationship.findFirst({
    select: { id: true, sourcePersonId: true, targetPersonId: true },
    where: { id: relationshipId, userId: user.id },
  });

  if (!existingRelationship) {
    throw new DomainError("Relationship not found", 404, "relationship_not_found");
  }

  if (
    existingRelationship.sourcePersonId !== personId &&
    existingRelationship.targetPersonId !== personId
  ) {
    throw new DomainError("Relationship not found", 404, "relationship_not_found");
  }

  const deleted = await db.peopleRelationship.deleteMany({
    where: { id: relationshipId, userId: user.id },
  });

  if (deleted.count === 0) {
    throw new DomainError("Relationship not found", 404, "relationship_not_found");
  }

  return { data: { deletedId: relationshipId } };
}
