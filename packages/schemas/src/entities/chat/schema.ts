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
  title: z.string().describe("Chat session title"),
});

/** Public chat model ids. The API maps each one to an Anthropic model id. */
export const chatModelIdSchema: z.ZodType<ChatModelId> = z
  .enum(["auto", "anthropic/claude-haiku-5.5", "anthropic/claude-sonnet-5.5"])
  .describe("Chat model id");

/**
 * Why the client posts a turn.
 * - `message`: a new user turn. Charges quota and saves the user message.
 * - `retry`: a new reply for the last turn. Charges quota, saves no user message.
 * - `approval`: a resume after a pending tool decision. Charges no quota.
 */
export const chatTurnIntentSchema: z.ZodType<ChatTurnIntent> = z
  .enum(["message", "retry", "approval"])
  .describe("Why the client posts this turn");

export const chatRequestSchema = z.object({
  intent: chatTurnIntentSchema.optional().describe("Why the client posts this turn"),
  messages: z.array(z.record(z.string(), z.unknown())).describe("Chat messages for this turn"),
  /** Omitted keeps the default model, so older clients keep working. */
  model: chatModelIdSchema.optional().describe("Chat model id. Omitted keeps the default model."),
  sessionId: z.string().describe("Chat session identifier"),
});

export const chatToolKindSchema: z.ZodType<ChatToolKind> = z.enum(["read", "write"]);

export const chatToolActivitySchema: z.ZodType<ChatToolActivity> = z.object({
  displayName: z.string().max(80).optional().describe("Human-readable tool name"),
  kind: chatToolKindSchema.describe("Whether the tool reads or writes data"),
  tool: z.string().describe("Tool identifier"),
});

/**
 * Stored JSON on a chat message. Older assistant rows are `{ text }` only,
 * and older user rows are `{ text }` too, so every new field is optional.
 */
export const chatMessageContentSchema = z.object({
  activities: z
    .array(chatToolActivitySchema)
    .max(20)
    .optional()
    .describe("Tools the assistant called during this turn"),
  status: z
    .enum(["complete", "incomplete"])
    .optional()
    .describe("Whether the assistant finished this turn"),
  text: z.string().optional().describe("Message text"),
  writeMayHaveLanded: z
    .boolean()
    .optional()
    .describe("True when a write tool may have changed data before the turn stopped"),
});

export const chatSessionSchema: z.ZodType<ChatSession> = entityIdentitySchema
  .extend({
    title: z.string().nullable().describe("Chat session title"),
  })
  .extend(entityAuditSchema.shape);

export const chatMessageRoleSchema: z.ZodType<ChatMessageRole> = z.enum(["user", "assistant"]);

export const chatMessageSchema: z.ZodType<ChatMessage> = z.object({
  content: z.unknown().describe("Stored message payload"),
  createdAt: createdAtSchema,
  id: z.string().describe("Message identifier"),
  role: z.string().describe("Whether this message is from the user or the assistant"),
  sessionId: z.string().describe("Chat session identifier"),
});

export const chatSessionsListResponseSchema: z.ZodType<ChatSessionsListResponse> =
  makePaginatedListResponseSchema("sessions", chatSessionSchema);

export const chatMessagesListResponseSchema: z.ZodType<ChatMessagesListResponse> =
  makePaginatedListResponseSchema("messages", chatMessageSchema);

export const chatSessionResponseSchema: z.ZodType<ChatSessionResponse> = z.object({
  session: chatSessionSchema.describe("Chat session record"),
});

/** @deprecated Use chatSessionResponseSchema */
export const chatSessionCreatedSchema: z.ZodType<ChatSessionCreated> = z.object({
  createdAt: createdAtSchema,
  id: z.string().describe("Chat session identifier"),
});

export const chatSessionCreatedResponseSchema = chatSessionResponseSchema;
