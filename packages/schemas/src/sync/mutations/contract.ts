import type { z } from "zod";
import type { Assert, IsEqual } from "#internal/type-equality.js";
import type {
  contactReplaceImportantDatesPayloadSchema,
  syncMutationTypeSchema,
} from "./schema.js";
import type { ContactReplaceImportantDatesPayload, SyncMutationType } from "./types.js";

type _SyncMutationType = Assert<IsEqual<SyncMutationType, z.infer<typeof syncMutationTypeSchema>>>;
type _ContactReplaceImportantDatesPayload = Assert<
  IsEqual<
    ContactReplaceImportantDatesPayload,
    z.infer<typeof contactReplaceImportantDatesPayloadSchema>
  >
>;
