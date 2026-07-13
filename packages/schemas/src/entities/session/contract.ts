import type { z } from "zod";
import type { Assert, IsEqual } from "#internal/type-equality.js";
import type { userSessionDataSchema, userSessionResponseSchema } from "./schema.js";
import type { UserSessionData, UserSessionResponse } from "./types.js";

type _UserSessionData = Assert<IsEqual<UserSessionData, z.infer<typeof userSessionDataSchema>>>;
type _UserSessionResponse = Assert<
  IsEqual<UserSessionResponse, z.infer<typeof userSessionResponseSchema>>
>;
