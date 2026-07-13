import type { z } from "zod";
import type { Assert, IsEqual } from "#internal/type-equality.js";
import type { hexColorSchema } from "./schema.js";
import type { HexColor } from "./types.js";

type _HexColor = Assert<IsEqual<HexColor, z.infer<typeof hexColorSchema>>>;
