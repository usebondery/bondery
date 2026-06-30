import { z } from "zod";
import { CONTACT_FIELD_MAX_LENGTHS, CONTACT_LIMITS, IMPORTANT_DATE_NOTIFY_DAYS, IMPORTANT_DATE_TYPES, } from "../constants/index.js";
import { entityAuditSchema, entityIdentitySchema } from "./_shared.js";
const isoDateSchema = z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Date must be YYYY-MM-DD" });
export const importantDateTypeSchema = z.enum(IMPORTANT_DATE_TYPES);
export const importantDateNotifyDaysSchema = z.union([
    z.literal(1),
    z.literal(3),
    z.literal(7),
    z.null(),
]);
const importantDateCoreSchema = z.object({
    type: importantDateTypeSchema,
    date: isoDateSchema,
});
const importantDateNoteSchema = z.string().nullable();
const importantDateBaseFieldsSchema = importantDateCoreSchema.extend({
    note: importantDateNoteSchema,
    notifyDaysBefore: importantDateNotifyDaysSchema,
});
export const importantDateSchema = entityIdentitySchema.extend({
    personId: z.string(),
    ...importantDateBaseFieldsSchema.shape,
    notifyOn: z.string().nullable(),
}).extend(entityAuditSchema.shape);
const importantDateNotifyDaysInputSchema = z.preprocess((value) => {
    if (value === "none" || value === "") {
        return null;
    }
    if (typeof value === "string") {
        const parsed = Number.parseInt(value, 10);
        return Number.isNaN(parsed) ? value : parsed;
    }
    return value;
}, importantDateNotifyDaysSchema);
/** One row in PUT /api/contacts/:id/important-dates body. */
export const importantDateInputSchema = z.object({
    id: z.string().optional(),
    ...importantDateCoreSchema.shape,
    note: z
        .string()
        .trim()
        .max(CONTACT_FIELD_MAX_LENGTHS.dateNote, {
        error: `Note must be at most ${CONTACT_FIELD_MAX_LENGTHS.dateNote} characters`,
    })
        .transform((value) => value || null)
        .nullable()
        .optional(),
    notifyDaysBefore: importantDateNotifyDaysInputSchema.optional(),
});
export const importantDateSheetSchema = z
    .object({
    ...importantDateCoreSchema.shape,
    note: z
        .string()
        .max(CONTACT_FIELD_MAX_LENGTHS.dateNote, {
        error: `Note must be at most ${CONTACT_FIELD_MAX_LENGTHS.dateNote} characters`,
    })
        .default(""),
    notifyDaysBefore: z.enum(["none", "1", "3", "7"]).default("none"),
})
    .transform((value) => ({
    type: value.type,
    date: value.date,
    note: value.note.trim() || null,
    notifyDaysBefore: value.notifyDaysBefore === "none"
        ? null
        : Number(value.notifyDaysBefore),
}));
/** Full replace payload with list-level business rules (mirrors web + mobile UI). */
export const replaceImportantDatesSchema = z
    .array(importantDateInputSchema)
    .max(CONTACT_LIMITS.maxImportantDates, {
    error: `Maximum of ${CONTACT_LIMITS.maxImportantDates} important dates allowed`,
})
    .superRefine((dates, context) => {
    const birthdayCount = dates.filter((entry) => entry.type === "birthday").length;
    const namedayCount = dates.filter((entry) => entry.type === "nameday").length;
    if (birthdayCount > 1) {
        context.addIssue({
            code: "custom",
            message: "Only one birthday is allowed per contact",
        });
    }
    if (namedayCount > 1) {
        context.addIssue({
            code: "custom",
            message: "Only one nameday is allowed per contact",
        });
    }
});
export { IMPORTANT_DATE_NOTIFY_DAYS, IMPORTANT_DATE_TYPES };
