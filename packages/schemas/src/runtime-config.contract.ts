import type { z } from "zod";
import type { Assert, IsEqual } from "#internal/type-equality.js";
import type { webappRuntimeConfigSchema } from "./runtime-config.js";
import type { WebappRuntimeConfig } from "./runtime-config.types.js";

export type _WebappRuntimeConfig = Assert<
  IsEqual<WebappRuntimeConfig, z.infer<typeof webappRuntimeConfigSchema>>
>;
