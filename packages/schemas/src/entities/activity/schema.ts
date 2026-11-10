import { z } from "zod";
import {
  createdAtSchema,
  entityAuditSchema,
  entityIdentitySchema,
  makePaginatedListResponseSchema,
  updatedAtSchema,
} from "../_shared/schema.js";
import type {
  CreateInteractionInput,
  Interaction,
  InteractionFormInput,
  InteractionParticipant,
  InteractionsListResponse,
  InteractionType,
  UpdateInteractionInput,
} from "./types.js";

export const interactionTypeSchema: z.ZodType<InteractionType> = z
  .enum([
    "Call",
    "Coffee",
    "Email",
    "Meal",
    "Meeting",
    "Networking event",
    "Note",
    "Other",
    "Party/Social",
    "Text/Messaging",
    "Competition/Hackathon",
    "Custom",
  ])
  .describe("Interaction category");

export const interactionParticipantSchema: z.ZodType<InteractionParticipant> = z.object({
  avatar: z.string().nullable().describe("Avatar image URL, or null when unset"),
  firstName: z.string().describe("Given name"),
  headline: z.string().nullable().describe("Short role or description line"),
  id: z.string().describe("Contact identifier"),
  lastName: z.string().nullable().describe("Family name"),
  location: z.string().nullable().describe("Free-text location"),
  middleName: z.string().nullable().describe("Middle name"),
  updatedAt: updatedAtSchema.optional(),
});

export const interactionSchema: z.ZodType<Interaction> = entityIdentitySchema
  .extend({
    date: createdAtSchema.describe("When the interaction happened"),
    description: z.string().nullable().describe("Free-text notes about the interaction"),
    participants: z
      .union([z.array(interactionParticipantSchema), z.array(z.string())])
      .optional()
      .describe("People who took part, as objects or contact ids"),
    title: z.string().nullable().describe("Short summary line"),
    type: interactionTypeSchema.describe("Interaction category"),
  })
  .extend(entityAuditSchema.shape);

export const createInteractionInputSchema: z.ZodType<CreateInteractionInput> = z.object({
  date: createdAtSchema.describe("When the interaction happened"),
  description: z.string().optional().describe("Free-text notes about the interaction"),
  participantIds: z.array(z.string()).describe("Contact ids of the people who took part"),
  title: z.string().optional().describe("Short summary line"),
  type: interactionTypeSchema.describe("Interaction category"),
});

export const interactionFormSchema: z.ZodType<InteractionFormInput> = z.object({
  date: z
    .string()
    .min(1, { error: "Please select a date" })
    .describe("When the interaction happened"),
  description: z.string().describe("Free-text notes about the interaction"),
  participantIds: z
    .array(z.string())
    .min(1, { error: "Please select at least one contact" })
    .describe("Contact ids of the people who took part"),
  title: z.string().trim().min(1, { error: "Title is required" }).describe("Short summary line"),
  type: z.string().min(1, { error: "Please select a type" }).describe("Interaction category"),
});

export const updateInteractionInputSchema: z.ZodType<UpdateInteractionInput> = z.object({
  date: createdAtSchema.optional().describe("When the interaction happened"),
  description: z.string().optional().describe("Free-text notes about the interaction"),
  participantIds: z
    .array(z.string())
    .optional()
    .describe("Contact ids of the people who took part"),
  title: z.string().optional().describe("Short summary line"),
  type: interactionTypeSchema.optional().describe("Interaction category"),
});

export const interactionsListResponseSchema: z.ZodType<InteractionsListResponse> =
  makePaginatedListResponseSchema("interactions", interactionSchema);

const interactionDetailSchema = z
  .object({
    date: createdAtSchema.describe("When the interaction happened"),
    description: z.string().nullable().describe("Free-text notes about the interaction"),
    id: z.string().describe("Interaction identifier"),
    participants: z.array(interactionParticipantSchema).describe("People who took part"),
    title: z.string().nullable().describe("Short summary line"),
    type: z.string().describe("Interaction category"),
  })
  .extend(entityAuditSchema.shape);

export const interactionResponseSchema = z.object({
  interaction: interactionDetailSchema.describe("Interaction record"),
});
