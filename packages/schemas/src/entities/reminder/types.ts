import type { ContactPreview } from "../contact/types.js";
import type { ImportantDate, ImportantDateType } from "../important-date/types.js";

export interface UpcomingReminder {
  importantDate: ImportantDate;
  notificationSent: boolean;
  notificationSentAt: string | null;
  person: ContactPreview;
}

export interface ReminderDigestItem {
  date: string;
  note?: string | null;
  notifyDaysBefore: 1 | 3 | 7;
  notifyOn: string;
  personAvatar?: string | null;
  personId: string;
  personName: string;
  type: ImportantDateType;
}

export interface ReminderDigestUser {
  email: string;
  reminders: ReminderDigestItem[];
  targetDate?: string;
  timezone?: string;
  userId: string;
}

export interface ReminderDigestRequest {
  targetDate: string;
  users: ReminderDigestUser[];
}

export interface ReminderDigestResponse {
  failedUsers: number;
  failures?: { email: string; error: string; userId: string }[];
  sentUsers: number;
  success: boolean;
  targetDate: string;
}

export interface UpcomingRemindersResponse {
  reminders: UpcomingReminder[];
}
