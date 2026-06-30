import { z } from "zod";
/**
 * Keep snake_case keys to match the existing chat API payloads.
 */
export declare const chatSessionSchema: z.ZodObject<{
    id: z.ZodString;
    user_id: z.ZodString;
    title: z.ZodNullable<z.ZodString>;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, z.core.$strip>;
export declare const chatMessageRoleSchema: z.ZodEnum<{
    user: "user";
    assistant: "assistant";
}>;
export declare const chatMessageSchema: z.ZodObject<{
    id: z.ZodString;
    session_id: z.ZodString;
    role: z.ZodEnum<{
        user: "user";
        assistant: "assistant";
    }>;
    content: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    created_at: z.ZodString;
}, z.core.$strip>;
export type ChatSession = z.infer<typeof chatSessionSchema>;
export type ChatMessageRole = z.infer<typeof chatMessageRoleSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
