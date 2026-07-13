import type { z } from "zod";
import type { Assert, IsEqual } from "#internal/type-equality.js";
import type {
  createInteractionInputSchema,
  interactionFormSchema,
  interactionParticipantSchema,
  interactionSchema,
  interactionsListResponseSchema,
  interactionTypeSchema,
  updateInteractionInputSchema,
} from "./schema.js";
import type {
  CreateInteractionInput,
  Interaction,
  InteractionFormInput,
  InteractionParticipant,
  InteractionsListResponse,
  InteractionType,
  UpdateInteractionInput,
} from "./types.js";

type _InteractionType = Assert<IsEqual<InteractionType, z.infer<typeof interactionTypeSchema>>>;
type _InteractionParticipant = Assert<
  IsEqual<InteractionParticipant, z.infer<typeof interactionParticipantSchema>>
>;
type _Interaction = Assert<IsEqual<Interaction, z.infer<typeof interactionSchema>>>;
type _CreateInteractionInput = Assert<
  IsEqual<CreateInteractionInput, z.infer<typeof createInteractionInputSchema>>
>;
type _UpdateInteractionInput = Assert<
  IsEqual<UpdateInteractionInput, z.infer<typeof updateInteractionInputSchema>>
>;
type _InteractionFormInput = Assert<
  IsEqual<InteractionFormInput, z.infer<typeof interactionFormSchema>>
>;
type _InteractionsListResponse = Assert<
  IsEqual<InteractionsListResponse, z.infer<typeof interactionsListResponseSchema>>
>;
