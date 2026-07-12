import type { z } from "zod";
import type { Assert, IsEqual } from "#internal/type-equality.js";
import type { contactIdSchema } from "./schema.js";
import type { ContactId } from "./types.js";

type _ContactId = Assert<IsEqual<ContactId, z.infer<typeof contactIdSchema>>>;
