export type ImportantDateType = "birthday" | "anniversary" | "nameday" | "graduation" | "other";

export type ImportantDateNotifyDaysBefore = 1 | 3 | 7 | null;

export interface ImportantDate {
  createdAt: string;
  date: string;
  id: string;
  note: string | null;
  notifyDaysBefore: number | null;
  notifyOn: string | null;
  personId: string;
  type: ImportantDateType;
  updatedAt: string;
  userId: string;
}

export interface ImportantDateInputValidated {
  date: string;
  id?: string;
  note?: string | null;
  notifyDaysBefore?: ImportantDateNotifyDaysBefore;
  type: ImportantDateType;
}

export interface ImportantDateSheetInput {
  date: string;
  note?: string;
  notifyDaysBefore?: "none" | "1" | "3" | "7";
  type: ImportantDateType;
}

export interface ImportantDateSheetOutput {
  date: string;
  note: string | null;
  notifyDaysBefore: ImportantDateNotifyDaysBefore;
  type: ImportantDateType;
}

export type ReplaceImportantDatesInput = ImportantDateInputValidated[];

export interface ImportantDatesListResponse {
  dates: ImportantDate[];
}
