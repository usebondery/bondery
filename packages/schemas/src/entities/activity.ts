import { z } from "zod";
import { entityAuditSchema, entityIdentitySchema } from "./_shared.js";

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

/**
 * Embedded participant shape returned by interaction endpoints.
 * Keep snake_case keys to match the current API wire contract.
 */
export const interactionParticipantSchema = z.object({
  id: z.string(),
  first_name: z.string(),
  last_name: z.string().nullable(),
  avatar: z.string().nullable(),
  updated_at: z.string().optional(),
});

export const interactionSchema = entityIdentitySchema
  .extend({
    title: z.string().nullable(),
    type: interactionTypeSchema,
    description: z.string().nullable(),
    date: z.string(),
    participants: z.union([z.array(interactionParticipantSchema), z.array(z.string())]).optional(),
  })
  .extend(entityAuditSchema.shape);

export const createInteractionInputSchema = z.object({
  title: z.string().optional(),
  type: z.string(),
  description: z.string().optional(),
  date: z.string(),
  participantIds: z.array(z.string()),
});

export const interactionFormSchema = z.object({
  title: z.string().trim().min(1, { error: "Title is required" }),
  participantIds: z.array(z.string()).min(1, { error: "Please select at least one contact" }),
  date: z.string().min(1, { error: "Please select a date" }),
  type: z.string().min(1, { error: "Please select a type" }),
  description: z.string(),
});

export const updateInteractionInputSchema = z.object({
  title: z.string().optional(),
  type: z.string().optional(),
  description: z.string().optional(),
  date: z.string().optional(),
  participantIds: z.array(z.string()).optional(),
});

export type InteractionType = z.infer<typeof interactionTypeSchema>;
export type InteractionParticipant = z.infer<typeof interactionParticipantSchema>;
export type Interaction = z.infer<typeof interactionSchema>;
export type CreateInteractionInput = z.infer<typeof createInteractionInputSchema>;
export type UpdateInteractionInput = z.infer<typeof updateInteractionInputSchema>;
export type InteractionFormInput = z.infer<typeof interactionFormSchema>;

export type ActivityType = InteractionType;
export type Activity = Interaction;
export type CreateActivityInput = CreateInteractionInput;
export type UpdateActivityInput = UpdateInteractionInput;
