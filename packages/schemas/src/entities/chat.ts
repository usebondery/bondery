import { z } from "zod";
import {
  createdAtSchema,
  entityAuditSchema,
  entityIdentitySchema,
  makePaginatedListResponseSchema,
} from "#entities/_shared.js";
import {
  EXAMPLE_CHAT_MESSAGES_LIST_RESPONSE,
  EXAMPLE_CHAT_SESSION_CREATED_RESPONSE,
  EXAMPLE_CHAT_SESSIONS_LIST_RESPONSE,
} from "#openapi/fixtures/schema-examples.js";
import {
  EXAMPLE_CHAT_REQUEST,
  EXAMPLE_UPDATE_CHAT_SESSION_REQUEST,
} from "#openapi/fixtures/requests.js";

export const updateChatSessionBodySchema = z.object({
  title: z.string(),
}).meta({ example: EXAMPLE_UPDATE_CHAT_SESSION_REQUEST });

export const chatRequestSchema = z.object({
  messages: z.array(z.record(z.string(), z.unknown())),
  sessionId: z.string(),
}).meta({ example: EXAMPLE_CHAT_REQUEST });

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
).meta({ example: EXAMPLE_CHAT_SESSIONS_LIST_RESPONSE });

export const chatMessagesListResponseSchema = makePaginatedListResponseSchema(
  "messages",
  chatMessageSchema,
).meta({ example: EXAMPLE_CHAT_MESSAGES_LIST_RESPONSE });

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
  .meta({ example: EXAMPLE_CHAT_SESSION_CREATED_RESPONSE });

export type ChatSessionCreatedResponse = z.infer<typeof chatSessionCreatedResponseSchema>;
