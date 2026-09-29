import { INTERACTION_TYPES } from "@bondery/helpers";
import { z } from "zod";
import { type DomainContext, DomainError } from "../../domains/_shared/context.js";
import {
  createInteraction,
  deleteInteraction,
  loadFormattedInteraction,
  updateInteraction,
} from "../interactions/index.js";
import { listInteractions } from "../interactions/queries.js";
import { ASSISTANT_COLLECTION_CAP, assistantPageSize } from "./collection-cap.js";

export const getInteractionsInputSchema = z.object({
  limit: z.number().int().min(1).max(ASSISTANT_COLLECTION_CAP).optional(),
  offset: z.number().int().min(0).optional(),
  personId: z.string().uuid().optional(),
});

export const getInteractionInputSchema = z.object({
  interactionId: z.string().uuid(),
});

export const createInteractionInputSchema = z.object({
  date: z.string().describe("ISO date (YYYY-MM-DD) or ISO datetime"),
  description: z.string().optional(),
  participantIds: z
    .array(z.string())
    .max(ASSISTANT_COLLECTION_CAP)
    .describe("Owned contact ids; at most 25"),
  title: z.string().optional(),
  type: z.enum(INTERACTION_TYPES),
});

export const updateInteractionInputSchema = z.object({
  date: z.string().optional().describe("ISO date (YYYY-MM-DD) or ISO datetime"),
  description: z.string().optional(),
  interactionId: z.string().uuid(),
  participantIds: z.array(z.string()).max(ASSISTANT_COLLECTION_CAP).optional(),
  title: z.string().optional(),
  type: z.enum(INTERACTION_TYPES).optional(),
});

export const deleteInteractionInputSchema = z.object({
  interactionId: z.string().uuid(),
});

export async function executeGetInteractions(
  ctx: DomainContext,
  args: z.infer<typeof getInteractionsInputSchema>,
) {
  return listInteractions(ctx, {
    ...(args.personId !== undefined ? { contactId: args.personId } : {}),
    limit: assistantPageSize(args.limit),
    offset: args.offset ?? 0,
  });
}

export async function executeGetInteraction(
  ctx: DomainContext,
  args: z.infer<typeof getInteractionInputSchema>,
) {
  const interaction = await loadFormattedInteraction(ctx, args.interactionId);
  if (!interaction) {
    throw new DomainError("Interaction not found", 404, "interaction_not_found");
  }
  return { interaction };
}

export async function executeCreateInteraction(
  ctx: DomainContext,
  args: z.infer<typeof createInteractionInputSchema>,
) {
  const interaction = await createInteraction(ctx, {
    date: args.date,
    description: args.description,
    participantIds: args.participantIds,
    title: args.title,
    type: args.type,
  });
  return { interaction };
}

export async function executeUpdateInteraction(
  ctx: DomainContext,
  args: z.infer<typeof updateInteractionInputSchema>,
) {
  const interaction = await updateInteraction(ctx, args.interactionId, {
    ...(args.date !== undefined ? { date: args.date } : {}),
    ...(args.description !== undefined ? { description: args.description } : {}),
    ...(args.participantIds !== undefined ? { participantIds: args.participantIds } : {}),
    ...(args.title !== undefined ? { title: args.title } : {}),
    ...(args.type !== undefined ? { type: args.type } : {}),
  });
  return { interaction };
}

export async function executeDeleteInteraction(
  ctx: DomainContext,
  args: z.infer<typeof deleteInteractionInputSchema>,
) {
  await deleteInteraction(ctx, args.interactionId);
  return { message: "Interaction deleted successfully" };
}
