import type { z } from "zod";
import type { Assert, IsEqual } from "#internal/type-equality.js";
import type {
  syncEmitMetaSchema,
  syncWsBatchSchema,
  syncWsHelloSchema,
  syncWsPingSchema,
  syncWsPongSchema,
  syncWsServerMessageSchema,
  syncWsTicketResponseSchema,
} from "./schema.js";
import type {
  SyncEmitMeta,
  SyncWsBatchMessage,
  SyncWsClientMessage,
  SyncWsHelloMessage,
  SyncWsPingMessage,
  SyncWsServerMessage,
  SyncWsTicketResponse,
} from "./types.js";

type _SyncEmitMeta = Assert<IsEqual<SyncEmitMeta, z.infer<typeof syncEmitMetaSchema>>>;
type _SyncWsHelloMessage = Assert<IsEqual<SyncWsHelloMessage, z.infer<typeof syncWsHelloSchema>>>;
type _SyncWsBatchMessage = Assert<IsEqual<SyncWsBatchMessage, z.infer<typeof syncWsBatchSchema>>>;
type _SyncWsPingMessage = Assert<IsEqual<SyncWsPingMessage, z.infer<typeof syncWsPingSchema>>>;
type _SyncWsServerMessage = Assert<
  IsEqual<SyncWsServerMessage, z.infer<typeof syncWsServerMessageSchema>>
>;
type _SyncWsClientMessage = Assert<IsEqual<SyncWsClientMessage, z.infer<typeof syncWsPongSchema>>>;
type _SyncWsTicketResponse = Assert<
  IsEqual<SyncWsTicketResponse, z.infer<typeof syncWsTicketResponseSchema>>
>;
