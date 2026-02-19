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
  | "Networking event"
  | "Note"
  | "Other"
  | "Party/Social"
  | "Text/Messaging"
  | "Competition/Hackathon"
  | "Custom";

export interface Activity {
  id: string;
  userId: string;
  title: string | null;
  type: ActivityType; // Stored as text in DB but typed here
  description: string | null;
  date: string; // ISO string
  createdAt: string;
  updatedAt: string;
  /** Array of participant IDs (fetched separately or joined) */
  participants?: string[];
}

export interface CreateActivityInput {
  title?: string;
  type: string; // Allow string for flexibility
  description?: string;
  date: string;
  participantIds: string[];
}

export interface UpdateActivityInput {
  title?: string;
  type?: string;
  description?: string;
  date?: string;
  participantIds?: string[]; // If provided, replaces existing participants
}
