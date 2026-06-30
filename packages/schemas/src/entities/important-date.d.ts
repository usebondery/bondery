import { z } from "zod";
import { IMPORTANT_DATE_NOTIFY_DAYS, IMPORTANT_DATE_TYPES } from "../constants/index.js";
export declare const importantDateTypeSchema: z.ZodEnum<{
    birthday: "birthday";
    anniversary: "anniversary";
    nameday: "nameday";
    graduation: "graduation";
    other: "other";
}>;
export declare const importantDateNotifyDaysSchema: z.ZodUnion<readonly [z.ZodLiteral<1>, z.ZodLiteral<3>, z.ZodLiteral<7>, z.ZodNull]>;
export declare const importantDateSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    notifyOn: z.ZodNullable<z.ZodString>;
    type: z.ZodEnum<{
        birthday: "birthday";
        anniversary: "anniversary";
        nameday: "nameday";
        graduation: "graduation";
        other: "other";
    }>;
    date: z.ZodString;
    note: z.ZodNullable<z.ZodString>;
    notifyDaysBefore: z.ZodUnion<readonly [z.ZodLiteral<1>, z.ZodLiteral<3>, z.ZodLiteral<7>, z.ZodNull]>;
    personId: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
/** One row in PUT /api/contacts/:id/important-dates body. */
export declare const importantDateInputSchema: z.ZodObject<{
    note: z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodString, z.ZodTransform<string | null, string>>>>;
    notifyDaysBefore: z.ZodOptional<z.ZodPreprocess<z.ZodUnion<readonly [z.ZodLiteral<1>, z.ZodLiteral<3>, z.ZodLiteral<7>, z.ZodNull]>>>;
    type: z.ZodEnum<{
        birthday: "birthday";
        anniversary: "anniversary";
        nameday: "nameday";
        graduation: "graduation";
        other: "other";
    }>;
    date: z.ZodString;
    id: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const importantDateSheetSchema: z.ZodPipe<z.ZodObject<{
    note: z.ZodDefault<z.ZodString>;
    notifyDaysBefore: z.ZodDefault<z.ZodEnum<{
        1: "1";
        3: "3";
        7: "7";
        none: "none";
    }>>;
    type: z.ZodEnum<{
        birthday: "birthday";
        anniversary: "anniversary";
        nameday: "nameday";
        graduation: "graduation";
        other: "other";
    }>;
    date: z.ZodString;
}, z.core.$strip>, z.ZodTransform<{
    type: "birthday" | "anniversary" | "nameday" | "graduation" | "other";
    date: string;
    note: string | null;
    notifyDaysBefore: 1 | 3 | 7 | null;
}, {
    note: string;
    notifyDaysBefore: "1" | "3" | "7" | "none";
    type: "birthday" | "anniversary" | "nameday" | "graduation" | "other";
    date: string;
}>>;
/** Full replace payload with list-level business rules (mirrors web + mobile UI). */
export declare const replaceImportantDatesSchema: z.ZodArray<z.ZodObject<{
    note: z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodString, z.ZodTransform<string | null, string>>>>;
    notifyDaysBefore: z.ZodOptional<z.ZodPreprocess<z.ZodUnion<readonly [z.ZodLiteral<1>, z.ZodLiteral<3>, z.ZodLiteral<7>, z.ZodNull]>>>;
    type: z.ZodEnum<{
        birthday: "birthday";
        anniversary: "anniversary";
        nameday: "nameday";
        graduation: "graduation";
        other: "other";
    }>;
    date: z.ZodString;
    id: z.ZodOptional<z.ZodString>;
}, z.core.$strip>>;
export type ImportantDateType = z.infer<typeof importantDateTypeSchema>;
export type ImportantDateNotifyDaysBefore = z.infer<typeof importantDateNotifyDaysSchema>;
export type ImportantDate = z.infer<typeof importantDateSchema>;
export type ImportantDateInputValidated = z.infer<typeof importantDateInputSchema>;
export type ImportantDateSheetInput = z.input<typeof importantDateSheetSchema>;
export type ImportantDateSheetOutput = z.output<typeof importantDateSheetSchema>;
export type ReplaceImportantDatesInput = z.infer<typeof replaceImportantDatesSchema>;
export { IMPORTANT_DATE_NOTIFY_DAYS, IMPORTANT_DATE_TYPES };
