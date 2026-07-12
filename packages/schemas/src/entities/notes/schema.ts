import { z } from "zod";
import { CONTACT_FIELD_MAX_LENGTHS } from "#constants/index.js";
import type { ContactNotesUpdateOutput } from "./types.js";

export const contactNotesUpdateSchema = z.object({
  notes: z
    .string()
    .max(CONTACT_FIELD_MAX_LENGTHS.notesHtml, {
      error: `Notes must be at most ${CONTACT_FIELD_MAX_LENGTHS.notesHtml} characters`,
    })
    .nullable(),
}) satisfies z.ZodType<ContactNotesUpdateOutput>;
