/**
 * Event Domain Types
 * Types for event management
 */

export type EventType =
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

export interface Event {
  id: string;
  userId: string;
  title: string | null;
  type: EventType; // Stored as text in DB but typed here
  description: string | null;
  date: string; // ISO string
  createdAt: string;
  updatedAt: string;
  /** Array of participant IDs (fetched separately or joined) */
  participants?: string[];
}

export interface CreateEventInput {
  title?: string;
  type: string; // Allow string for flexibility
  description?: string;
  date: string;
  participantIds: string[];
}

export interface UpdateEventInput {
  title?: string;
  type?: string;
  description?: string;
  date?: string;
  participantIds?: string[]; // If provided, replaces existing participants
}

export type ActivityType = EventType;
export type Activity = Event;
export type CreateActivityInput = CreateEventInput;
export type UpdateActivityInput = UpdateEventInput;
