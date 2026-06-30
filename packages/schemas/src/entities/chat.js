import { z } from "zod";
/**
 * Keep snake_case keys to match the existing chat API payloads.
 */
export const chatSessionSchema = z.object({
    id: z.string(),
    user_id: z.string(),
    title: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
});
export const chatMessageRoleSchema = z.enum(["user", "assistant"]);
export const chatMessageSchema = z.object({
    id: z.string(),
    session_id: z.string(),
    role: chatMessageRoleSchema,
    content: z.record(z.string(), z.unknown()),
    created_at: z.string(),
});
