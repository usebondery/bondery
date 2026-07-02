import { z } from "zod";
import {
  CONTACT_FIELD_MAX_LENGTHS,
  CONTACT_LIMITS,
  IMPORTANT_DATE_NOTIFY_DAYS,
  IMPORTANT_DATE_TYPES,
} from "#constants/index.js";
import {
  entityAuditSchema,
  entityIdentitySchema,
  makeCollectionResponseSchema,
} from "#entities/_shared.js";
import { EXAMPLE_IMPORTANT_DATES_LIST_RESPONSE } from "#openapi/fixtures/schema-examples.js";

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

/** Wire/read shape — DB may return any integer before validation normalizes. */
const importantDateNotifyDaysWireSchema = z.number().int().nullable();

const importantDateCoreSchema = z.object({
  type: importantDateTypeSchema,
  date: isoDateSchema,
});

const importantDateNoteSchema = z.string().nullable();

const importantDateBaseFieldsSchema = importantDateCoreSchema.extend({
  note: importantDateNoteSchema,
  notifyDaysBefore: importantDateNotifyDaysWireSchema,
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
    notifyDaysBefore:
      value.notifyDaysBefore === "none"
        ? null
        : (Number(value.notifyDaysBefore) as 1 | 3 | 7),
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

export const importantDatesListResponseSchema = makeCollectionResponseSchema(
  "dates",
  importantDateSchema,
).meta({ example: EXAMPLE_IMPORTANT_DATES_LIST_RESPONSE });

export type ImportantDatesListResponse = z.infer<typeof importantDatesListResponseSchema>;
export type ImportantDateType = z.infer<typeof importantDateTypeSchema>;
export type ImportantDateNotifyDaysBefore = z.infer<typeof importantDateNotifyDaysSchema>;
export type ImportantDate = z.infer<typeof importantDateSchema>;
export type ImportantDateInputValidated = z.infer<typeof importantDateInputSchema>;
export type ImportantDateSheetInput = z.input<typeof importantDateSheetSchema>;
export type ImportantDateSheetOutput = z.output<typeof importantDateSheetSchema>;
export type ReplaceImportantDatesInput = z.infer<typeof replaceImportantDatesSchema>;

export { IMPORTANT_DATE_NOTIFY_DAYS, IMPORTANT_DATE_TYPES };
