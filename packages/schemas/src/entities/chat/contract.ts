import type { z } from "zod";
import type { Assert, IsEqual } from "#internal/type-equality.js";
import type {
  chatMessageContentSchema,
  chatMessageRoleSchema,
  chatMessageSchema,
  chatMessagesListResponseSchema,
  chatModelIdSchema,
  chatSessionCreatedResponseSchema,
  chatSessionCreatedSchema,
  chatSessionResponseSchema,
  chatSessionSchema,
  chatSessionsListResponseSchema,
  chatToolActivitySchema,
  chatToolKindSchema,
  chatTurnIntentSchema,
} from "./schema.js";
import type {
  ChatMessage,
  ChatMessageContent,
  ChatMessageRole,
  ChatMessagesListResponse,
  ChatModelId,
  ChatSession,
  ChatSessionCreated,
  ChatSessionCreatedResponse,
  ChatSessionResponse,
  ChatSessionsListResponse,
  ChatToolActivity,
  ChatToolKind,
  ChatTurnIntent,
} from "./types.js";

type _ChatSession = Assert<IsEqual<ChatSession, z.infer<typeof chatSessionSchema>>>;
type _ChatMessageRole = Assert<IsEqual<ChatMessageRole, z.infer<typeof chatMessageRoleSchema>>>;
type _ChatMessage = Assert<IsEqual<ChatMessage, z.infer<typeof chatMessageSchema>>>;
type _ChatModelId = Assert<IsEqual<ChatModelId, z.infer<typeof chatModelIdSchema>>>;
type _ChatTurnIntent = Assert<IsEqual<ChatTurnIntent, z.infer<typeof chatTurnIntentSchema>>>;
type _ChatToolKind = Assert<IsEqual<ChatToolKind, z.infer<typeof chatToolKindSchema>>>;
type _ChatToolActivity = Assert<IsEqual<ChatToolActivity, z.infer<typeof chatToolActivitySchema>>>;
type _ChatMessageContent = Assert<
  IsEqual<ChatMessageContent, z.infer<typeof chatMessageContentSchema>>
>;
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
