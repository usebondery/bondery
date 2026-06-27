import { z } from "zod";
import { CONTACT_FIELD_MAX_LENGTHS } from "../constants/index.js";

export const contactNotesUpdateSchema = z.object({
  notes: z
    .string()
    .max(CONTACT_FIELD_MAX_LENGTHS.notesHtml, {
      error: `Notes must be at most ${CONTACT_FIELD_MAX_LENGTHS.notesHtml} characters`,
    })
    .nullable(),
});

export type ContactNotesUpdateInput = z.input<typeof contactNotesUpdateSchema>;
export type ContactNotesUpdateOutput = z.output<typeof contactNotesUpdateSchema>;
