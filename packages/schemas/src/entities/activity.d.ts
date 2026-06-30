import { z } from "zod";
export declare const interactionTypeSchema: z.ZodEnum<{
    Call: "Call";
    Coffee: "Coffee";
    Email: "Email";
    Meal: "Meal";
    Meeting: "Meeting";
    "Networking event": "Networking event";
    Note: "Note";
    Other: "Other";
    "Party/Social": "Party/Social";
    "Text/Messaging": "Text/Messaging";
    "Competition/Hackathon": "Competition/Hackathon";
    Custom: "Custom";
}>;
/**
 * Embedded participant shape returned by interaction endpoints.
 * Keep snake_case keys to match the current API wire contract.
 */
export declare const interactionParticipantSchema: z.ZodObject<{
    id: z.ZodString;
    first_name: z.ZodString;
    last_name: z.ZodNullable<z.ZodString>;
    avatar: z.ZodNullable<z.ZodString>;
    updated_at: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const interactionSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    title: z.ZodNullable<z.ZodString>;
    type: z.ZodEnum<{
        Call: "Call";
        Coffee: "Coffee";
        Email: "Email";
        Meal: "Meal";
        Meeting: "Meeting";
        "Networking event": "Networking event";
        Note: "Note";
        Other: "Other";
        "Party/Social": "Party/Social";
        "Text/Messaging": "Text/Messaging";
        "Competition/Hackathon": "Competition/Hackathon";
        Custom: "Custom";
    }>;
    description: z.ZodNullable<z.ZodString>;
    date: z.ZodString;
    participants: z.ZodOptional<z.ZodUnion<readonly [z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        first_name: z.ZodString;
        last_name: z.ZodNullable<z.ZodString>;
        avatar: z.ZodNullable<z.ZodString>;
        updated_at: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>, z.ZodArray<z.ZodString>]>>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export declare const createInteractionInputSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    type: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    date: z.ZodString;
    participantIds: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export declare const interactionFormSchema: z.ZodObject<{
    title: z.ZodString;
    participantIds: z.ZodArray<z.ZodString>;
    date: z.ZodString;
    type: z.ZodString;
    description: z.ZodString;
}, z.core.$strip>;
export declare const updateInteractionInputSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    date: z.ZodOptional<z.ZodString>;
    participantIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
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
