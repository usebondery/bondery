import type { z } from "zod";
import type { Assert, IsEqual } from "#internal/type-equality.js";
import type { apiErrorBodySchema, apiErrorResponseSchema } from "./schema.js";
import type { ApiErrorBody, ApiErrorResponse } from "./types.js";

type _ApiErrorBody = Assert<IsEqual<ApiErrorBody, z.infer<typeof apiErrorBodySchema>>>;
type _ApiErrorResponse = Assert<IsEqual<ApiErrorResponse, z.infer<typeof apiErrorResponseSchema>>>;
