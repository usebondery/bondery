import { z } from "zod";
import {
  createdAtSchema,
  entityAuditSchema,
  entityIdentitySchema,
  makePaginatedListResponseSchema,
  updatedAtSchema,
} from "#entities/_shared.js";

export const interactionTypeSchema = z.enum([
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
]);

export const interactionParticipantSchema = z.object({
  avatar: z.string().nullable(),
  firstName: z.string(),
  id: z.string(),
  lastName: z.string().nullable(),
  updatedAt: updatedAtSchema.optional(),
});

export const interactionSchema = entityIdentitySchema
  .extend({
    date: createdAtSchema,
    description: z.string().nullable(),
    participants: z.union([z.array(interactionParticipantSchema), z.array(z.string())]).optional(),
    title: z.string().nullable(),
    type: interactionTypeSchema,
  })
  .extend(entityAuditSchema.shape);

export const createInteractionInputSchema = z.object({
  date: createdAtSchema,
  description: z.string().optional(),
  participantIds: z.array(z.string()),
  title: z.string().optional(),
  type: interactionTypeSchema,
});

export const interactionFormSchema = z.object({
  date: z.string().min(1, { error: "Please select a date" }),
  description: z.string(),
  participantIds: z.array(z.string()).min(1, { error: "Please select at least one contact" }),
  title: z.string().trim().min(1, { error: "Title is required" }),
  type: z.string().min(1, { error: "Please select a type" }),
});

export const updateInteractionInputSchema = z.object({
  date: createdAtSchema.optional(),
  description: z.string().optional(),
  participantIds: z.array(z.string()).optional(),
  title: z.string().optional(),
  type: interactionTypeSchema.optional(),
});

export const interactionsListResponseSchema = makePaginatedListResponseSchema(
  "interactions",
  interactionSchema,
);

const interactionDetailSchema = z
  .object({
    date: createdAtSchema,
    description: z.string().nullable(),
    id: z.string(),
    participants: z.array(z.object({}).passthrough()),
    title: z.string().nullable(),
    type: z.string(),
  })
  .extend(entityAuditSchema.shape);

export const interactionResponseSchema = z.object({
  interaction: interactionDetailSchema,
});

export type InteractionType = z.infer<typeof interactionTypeSchema>;
export type InteractionParticipant = z.infer<typeof interactionParticipantSchema>;
export type Interaction = z.infer<typeof interactionSchema>;
export type CreateInteractionInput = z.infer<typeof createInteractionInputSchema>;
export type UpdateInteractionInput = z.infer<typeof updateInteractionInputSchema>;
export type InteractionFormInput = z.infer<typeof interactionFormSchema>;
export type InteractionsListResponse = z.infer<typeof interactionsListResponseSchema>;

export type ActivityType = InteractionType;
export type Activity = Interaction;
export type CreateActivityInput = CreateInteractionInput;
export type UpdateActivityInput = UpdateInteractionInput;
