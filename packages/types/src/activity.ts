/**
 * Activity Domain Types
 * Types for activity management
 */

export type ActivityType =
  | "Call"
  | "Coffee"
  | "Email"
  | "Meal"
  | "Meeting"
  | "Networking"
  | "Note"
  | "Other"
  | "Party/Social"
  | "Text/Messaging"
  | "Custom";

export interface Activity {
  id: string;
  userId: string;
  type: ActivityType; // Stored as text in DB but typed here
  description: string | null;
  location: string | null;
  date: string; // ISO string
  attachmentPath: string | null;
  createdAt: string;
  updatedAt: string;
  /** Array of participant IDs (fetched separately or joined) */
  participants?: string[];
}

export interface CreateActivityInput {
  type: string; // Allow string for flexibility
  description?: string;
  location?: string;
  date: string;
  attachmentPath?: string;
  participantIds: string[];
}

export interface UpdateActivityInput {
  type?: string;
  description?: string;
  location?: string;
  date?: string;
  attachmentPath?: string;
  participantIds?: string[]; // If provided, replaces existing participants
}
