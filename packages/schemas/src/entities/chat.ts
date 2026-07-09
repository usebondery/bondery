import { z } from "zod";
import {
  createdAtSchema,
  entityAuditSchema,
  entityIdentitySchema,
  makePaginatedListResponseSchema,
} from "#entities/_shared.js";

export const updateChatSessionBodySchema = z.object({
  title: z.string(),
});

export const chatRequestSchema = z.object({
  messages: z.array(z.record(z.string(), z.unknown())),
  sessionId: z.string(),
});

export const chatSessionSchema = entityIdentitySchema
  .extend({
    title: z.string().nullable(),
  })
  .extend(entityAuditSchema.shape);

export const chatMessageRoleSchema = z.enum(["user", "assistant"]);

export const chatMessageSchema = z.object({
  content: z.unknown(),
  createdAt: createdAtSchema,
  id: z.string(),
  role: z.string(),
  sessionId: z.string(),
});

export const chatSessionsListResponseSchema = makePaginatedListResponseSchema(
  "sessions",
  chatSessionSchema,
);

export const chatMessagesListResponseSchema = makePaginatedListResponseSchema(
  "messages",
  chatMessageSchema,
);

export const chatSessionResponseSchema = z.object({
  session: chatSessionSchema,
});

export type ChatSessionResponse = z.infer<typeof chatSessionResponseSchema>;

/** @deprecated Use chatSessionResponseSchema */
export const chatSessionCreatedSchema = z.object({
  createdAt: createdAtSchema,
  id: z.string(),
});

export type ChatSession = z.infer<typeof chatSessionSchema>;
export type ChatMessageRole = z.infer<typeof chatMessageRoleSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatSessionsListResponse = z.infer<typeof chatSessionsListResponseSchema>;
export type ChatMessagesListResponse = z.infer<typeof chatMessagesListResponseSchema>;
export type ChatSessionCreated = z.infer<typeof chatSessionCreatedSchema>;
export const chatSessionCreatedResponseSchema = chatSessionResponseSchema;

export type ChatSessionCreatedResponse = z.infer<typeof chatSessionCreatedResponseSchema>;
