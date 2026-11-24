import type { z } from "zod";
import type { Assert, IsEqual } from "#internal/type-equality.js";
import type {
  importantDateInputSchema,
  importantDateNotifyDaysSchema,
  importantDateSchema,
  importantDateSheetSchema,
  importantDatesListResponseSchema,
  importantDateTypeSchema,
  replaceImportantDatesSchema,
} from "./schema.js";
import type {
  ImportantDate,
  ImportantDateInputValidated,
  ImportantDateNotifyDaysBefore,
  ImportantDateSheetInput,
  ImportantDateSheetOutput,
  ImportantDatesListResponse,
  ImportantDateType,
  ReplaceImportantDatesInput,
} from "./types.js";

export type _ImportantDateType = Assert<
  IsEqual<ImportantDateType, z.infer<typeof importantDateTypeSchema>>
>;
export type _ImportantDateNotifyDaysBefore = Assert<
  IsEqual<ImportantDateNotifyDaysBefore, z.infer<typeof importantDateNotifyDaysSchema>>
>;
export type _ImportantDate = Assert<IsEqual<ImportantDate, z.infer<typeof importantDateSchema>>>;
export type _ImportantDateInputValidated = Assert<
  IsEqual<ImportantDateInputValidated, z.infer<typeof importantDateInputSchema>>
>;
export type _ImportantDateSheetInput = Assert<
  IsEqual<ImportantDateSheetInput, z.input<typeof importantDateSheetSchema>>
>;
export type _ImportantDateSheetOutput = Assert<
  IsEqual<ImportantDateSheetOutput, z.output<typeof importantDateSheetSchema>>
>;
export type _ReplaceImportantDatesInput = Assert<
  IsEqual<ReplaceImportantDatesInput, z.infer<typeof replaceImportantDatesSchema>>
>;
export type _ImportantDatesListResponse = Assert<
  IsEqual<ImportantDatesListResponse, z.infer<typeof importantDatesListResponseSchema>>
>;
