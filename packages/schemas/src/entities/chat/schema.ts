import { z } from "zod";
import {
  createdAtSchema,
  entityAuditSchema,
  entityIdentitySchema,
  makePaginatedListResponseSchema,
} from "../_shared/schema.js";
import type {
  ChatMessage,
  ChatMessageRole,
  ChatMessagesListResponse,
  ChatSession,
  ChatSessionCreated,
  ChatSessionResponse,
  ChatSessionsListResponse,
} from "./types.js";

export const updateChatSessionBodySchema = z.object({
  title: z.string(),
});

export const chatRequestSchema = z.object({
  messages: z.array(z.record(z.string(), z.unknown())),
  sessionId: z.string(),
});

export const chatSessionSchema: z.ZodType<ChatSession> = entityIdentitySchema
  .extend({
    title: z.string().nullable(),
  })
  .extend(entityAuditSchema.shape);

export const chatMessageRoleSchema: z.ZodType<ChatMessageRole> = z.enum(["user", "assistant"]);

export const chatMessageSchema: z.ZodType<ChatMessage> = z.object({
  content: z.unknown(),
  createdAt: createdAtSchema,
  id: z.string(),
  role: z.string(),
  sessionId: z.string(),
});

export const chatSessionsListResponseSchema: z.ZodType<ChatSessionsListResponse> =
  makePaginatedListResponseSchema("sessions", chatSessionSchema);

export const chatMessagesListResponseSchema: z.ZodType<ChatMessagesListResponse> =
  makePaginatedListResponseSchema("messages", chatMessageSchema);

export const chatSessionResponseSchema: z.ZodType<ChatSessionResponse> = z.object({
  session: chatSessionSchema,
});

/** @deprecated Use chatSessionResponseSchema */
export const chatSessionCreatedSchema: z.ZodType<ChatSessionCreated> = z.object({
  createdAt: createdAtSchema,
  id: z.string(),
});

export const chatSessionCreatedResponseSchema = chatSessionResponseSchema;
