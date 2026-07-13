import type { z } from "zod";
import type { Assert, IsEqual } from "#internal/type-equality.js";
import type { paginationMetaSchema } from "./schema.js";
import type { PaginationMeta } from "./types.js";

type _PaginationMeta = Assert<IsEqual<PaginationMeta, z.infer<typeof paginationMetaSchema>>>;
