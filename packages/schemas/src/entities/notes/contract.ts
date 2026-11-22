import type { z } from "zod";
import type { Assert, IsEqual } from "#internal/type-equality.js";
import type { contactNotesUpdateSchema } from "./schema.js";
import type { ContactNotesUpdateInput, ContactNotesUpdateOutput } from "./types.js";

export type _ContactNotesUpdateInput = Assert<
  IsEqual<ContactNotesUpdateInput, z.input<typeof contactNotesUpdateSchema>>
>;
export type _ContactNotesUpdateOutput = Assert<
  IsEqual<ContactNotesUpdateOutput, z.output<typeof contactNotesUpdateSchema>>
>;
