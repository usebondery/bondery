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
  id: z.string(),
  sessionId: z.string(),
  role: z.string(),
  content: z.unknown(),
  createdAt: createdAtSchema,
});

export const chatSessionsListResponseSchema = makePaginatedListResponseSchema(
  "sessions",
  chatSessionSchema,
);

export const chatMessagesListResponseSchema = makePaginatedListResponseSchema(
  "messages",
  chatMessageSchema,
);

export const chatSessionCreatedSchema = z.object({
  id: z.string(),
  createdAt: createdAtSchema,
});

export type ChatSession = z.infer<typeof chatSessionSchema>;
export type ChatMessageRole = z.infer<typeof chatMessageRoleSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatSessionsListResponse = z.infer<typeof chatSessionsListResponseSchema>;
export type ChatMessagesListResponse = z.infer<typeof chatMessagesListResponseSchema>;
export type ChatSessionCreated = z.infer<typeof chatSessionCreatedSchema>;
export const chatSessionCreatedResponseSchema = z
  .object({
    data: chatSessionCreatedSchema,
  })
  ;

export type ChatSessionCreatedResponse = z.infer<typeof chatSessionCreatedResponseSchema>;
