import type { z } from "zod";
import type { Assert, IsEqual } from "#internal/type-equality.js";
import type { syncMutationTypeSchema } from "./schema.js";
import type { SyncMutationType } from "./types.js";

type _SyncMutationType = Assert<IsEqual<SyncMutationType, z.infer<typeof syncMutationTypeSchema>>>;
