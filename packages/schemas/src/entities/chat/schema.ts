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
  ChatModelId,
  ChatSession,
  ChatSessionCreated,
  ChatSessionResponse,
  ChatSessionsListResponse,
  ChatToolActivity,
  ChatToolKind,
  ChatTurnIntent,
} from "./types.js";

export const updateChatSessionBodySchema = z.object({
  title: z.string(),
});

/** Public chat model ids. The API maps each one to an Anthropic model id. */
export const chatModelIdSchema: z.ZodType<ChatModelId> = z.enum([
  "auto",
  "anthropic/claude-haiku-5.5",
  "anthropic/claude-sonnet-5.5",
]);

/**
 * Why the client posts a turn.
 * - `message`: a new user turn. Charges quota and saves the user message.
 * - `retry`: a new reply for the last turn. Charges quota, saves no user message.
 * - `approval`: a resume after a pending tool decision. Charges no quota.
 */
export const chatTurnIntentSchema: z.ZodType<ChatTurnIntent> = z.enum([
  "message",
  "retry",
  "approval",
]);

export const chatRequestSchema = z.object({
  intent: chatTurnIntentSchema.optional(),
  messages: z.array(z.record(z.string(), z.unknown())),
  /** Omitted keeps the default model, so older clients keep working. */
  model: chatModelIdSchema.optional(),
  sessionId: z.string(),
});

export const chatToolKindSchema: z.ZodType<ChatToolKind> = z.enum(["read", "write"]);

export const chatToolActivitySchema: z.ZodType<ChatToolActivity> = z.object({
  displayName: z.string().max(80).optional(),
  kind: chatToolKindSchema,
  tool: z.string(),
});

/**
 * Stored JSON on a chat message. Older assistant rows are `{ text }` only,
 * and older user rows are `{ text }` too, so every new field is optional.
 */
export const chatMessageContentSchema = z.object({
  activities: z.array(chatToolActivitySchema).max(20).optional(),
  status: z.enum(["complete", "incomplete"]).optional(),
  text: z.string().optional(),
  writeMayHaveLanded: z.boolean().optional(),
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
