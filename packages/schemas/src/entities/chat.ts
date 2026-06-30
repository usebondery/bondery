import { z } from "zod";
import { makePaginatedListResponseSchema } from "./_shared.js";

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
  role: z.string(),
  content: z.unknown(),
  created_at: z.string().nullable(),
});

export const chatSessionsListResponseSchema = makePaginatedListResponseSchema(
  "sessions",
  chatSessionSchema,
);

export const chatMessagesListResponseSchema = makePaginatedListResponseSchema(
  "messages",
  chatMessageSchema,
);

export type ChatSession = z.infer<typeof chatSessionSchema>;
export type ChatMessageRole = z.infer<typeof chatMessageRoleSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatSessionsListResponse = z.infer<typeof chatSessionsListResponseSchema>;
export type ChatMessagesListResponse = z.infer<typeof chatMessagesListResponseSchema>;
