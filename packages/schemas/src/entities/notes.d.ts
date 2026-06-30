import { z } from "zod";
export declare const contactNotesUpdateSchema: z.ZodObject<{
    notes: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export type ContactNotesUpdateInput = z.input<typeof contactNotesUpdateSchema>;
export type ContactNotesUpdateOutput = z.output<typeof contactNotesUpdateSchema>;
