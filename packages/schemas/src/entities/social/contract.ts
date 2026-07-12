import type { z } from "zod";
import type { Assert, IsEqual } from "#internal/type-equality.js";
import type { socialHandleInputSchema, socialPlatformSchema } from "./schema.js";
import type { SocialHandleInput, SocialPlatform } from "./types.js";

type _SocialPlatform = Assert<IsEqual<SocialPlatform, z.infer<typeof socialPlatformSchema>>>;
type _SocialHandleInput = Assert<
  IsEqual<SocialHandleInput, z.input<typeof socialHandleInputSchema>>
>;
