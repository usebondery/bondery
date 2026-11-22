import type { z } from "zod";
import type { Assert, IsEqual } from "#internal/type-equality.js";
import type { socialHandleInputSchema, socialPlatformSchema } from "./schema.js";
import type { SocialHandleInput, SocialPlatform } from "./types.js";

export type _SocialPlatform = Assert<IsEqual<SocialPlatform, z.infer<typeof socialPlatformSchema>>>;
export type _SocialHandleInput = Assert<
  IsEqual<SocialHandleInput, z.input<typeof socialHandleInputSchema>>
>;
