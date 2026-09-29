import { relationshipTypeSchema } from "@bondery/schemas";
import { z } from "zod";
import type { DomainContext } from "../../domains/_shared/context.js";
import {
  createRelationship,
  deleteRelationship,
  updateRelationship,
} from "../../domains/contacts/relationships.js";
import { listContactRelationships } from "../contacts/queries-detail.js";
import { ASSISTANT_COLLECTION_CAP } from "./collection-cap.js";

export const getRelationshipsInputSchema = z.object({
  personId: z.string().uuid(),
});

export const createRelationshipInputSchema = z.object({
  personId: z.string().uuid().describe("Source contact"),
  relatedPersonId: z.string().uuid().describe("Related contact"),
  relationshipType: relationshipTypeSchema,
});

export const updateRelationshipInputSchema = z.object({
  personId: z.string().uuid(),
  relatedPersonId: z.string().uuid(),
  relationshipId: z.string().uuid(),
  relationshipType: relationshipTypeSchema,
});

export const deleteRelationshipInputSchema = z.object({
  personId: z.string().uuid(),
  relationshipId: z.string().uuid(),
});

export async function executeGetRelationships(
  ctx: DomainContext,
  args: z.infer<typeof getRelationshipsInputSchema>,
) {
  const result = await listContactRelationships(ctx, args.personId);
  return {
    relationships: result.relationships.slice(0, ASSISTANT_COLLECTION_CAP),
  };
}

export async function executeCreateRelationship(
  ctx: DomainContext,
  args: z.infer<typeof createRelationshipInputSchema>,
) {
  const created = await createRelationship(
    ctx,
    args.personId,
    args.relatedPersonId,
    args.relationshipType,
  );
  return { relationship: created.data.relationship };
}

export async function executeUpdateRelationship(
  ctx: DomainContext,
  args: z.infer<typeof updateRelationshipInputSchema>,
) {
  const updated = await updateRelationship(
    ctx,
    args.personId,
    args.relationshipId,
    args.relatedPersonId,
    args.relationshipType,
  );
  return { relationship: updated.data.relationship };
}

export async function executeDeleteRelationship(
  ctx: DomainContext,
  args: z.infer<typeof deleteRelationshipInputSchema>,
) {
  await deleteRelationship(ctx, args.personId, args.relationshipId);
  return { message: "Relationship deleted successfully" };
}
