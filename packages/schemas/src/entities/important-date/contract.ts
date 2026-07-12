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

type _ImportantDateType = Assert<
  IsEqual<ImportantDateType, z.infer<typeof importantDateTypeSchema>>
>;
type _ImportantDateNotifyDaysBefore = Assert<
  IsEqual<ImportantDateNotifyDaysBefore, z.infer<typeof importantDateNotifyDaysSchema>>
>;
type _ImportantDate = Assert<IsEqual<ImportantDate, z.infer<typeof importantDateSchema>>>;
type _ImportantDateInputValidated = Assert<
  IsEqual<ImportantDateInputValidated, z.infer<typeof importantDateInputSchema>>
>;
type _ImportantDateSheetInput = Assert<
  IsEqual<ImportantDateSheetInput, z.input<typeof importantDateSheetSchema>>
>;
type _ImportantDateSheetOutput = Assert<
  IsEqual<ImportantDateSheetOutput, z.output<typeof importantDateSheetSchema>>
>;
type _ReplaceImportantDatesInput = Assert<
  IsEqual<ReplaceImportantDatesInput, z.infer<typeof replaceImportantDatesSchema>>
>;
type _ImportantDatesListResponse = Assert<
  IsEqual<ImportantDatesListResponse, z.infer<typeof importantDatesListResponseSchema>>
>;
