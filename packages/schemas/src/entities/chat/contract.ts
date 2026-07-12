import type { z } from "zod";
import type { Assert, IsEqual } from "#internal/type-equality.js";
import type {
  chatMessageRoleSchema,
  chatMessageSchema,
  chatMessagesListResponseSchema,
  chatSessionCreatedResponseSchema,
  chatSessionCreatedSchema,
  chatSessionResponseSchema,
  chatSessionSchema,
  chatSessionsListResponseSchema,
} from "./schema.js";
import type {
  ChatMessage,
  ChatMessageRole,
  ChatMessagesListResponse,
  ChatSession,
  ChatSessionCreated,
  ChatSessionCreatedResponse,
  ChatSessionResponse,
  ChatSessionsListResponse,
} from "./types.js";

type _ChatSession = Assert<IsEqual<ChatSession, z.infer<typeof chatSessionSchema>>>;
type _ChatMessageRole = Assert<IsEqual<ChatMessageRole, z.infer<typeof chatMessageRoleSchema>>>;
type _ChatMessage = Assert<IsEqual<ChatMessage, z.infer<typeof chatMessageSchema>>>;
type _ChatSessionsListResponse = Assert<
  IsEqual<ChatSessionsListResponse, z.infer<typeof chatSessionsListResponseSchema>>
>;
type _ChatMessagesListResponse = Assert<
  IsEqual<ChatMessagesListResponse, z.infer<typeof chatMessagesListResponseSchema>>
>;
type _ChatSessionResponse = Assert<
  IsEqual<ChatSessionResponse, z.infer<typeof chatSessionResponseSchema>>
>;
type _ChatSessionCreated = Assert<
  IsEqual<ChatSessionCreated, z.infer<typeof chatSessionCreatedSchema>>
>;
type _ChatSessionCreatedResponse = Assert<
  IsEqual<ChatSessionCreatedResponse, z.infer<typeof chatSessionCreatedResponseSchema>>
>;
