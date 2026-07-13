import type { z } from "zod";
import type { Assert, IsEqual } from "#internal/type-equality.js";
import type { supportedLocaleSchema } from "./schema.js";
import type { SupportedLocale } from "./types.js";

type _SupportedLocale = Assert<IsEqual<SupportedLocale, z.infer<typeof supportedLocaleSchema>>>;
