/**
 * Interaction Domain Types
 * Types for timeline interaction management
 */

export type InteractionType =
  | "Call"
  | "Coffee"
  | "Email"
  | "Meal"
  | "Meeting"
  | "Networking interaction"
  | "Note"
  | "Other"
  | "Party/Social"
  | "Text/Messaging"
  | "Competition/Hackathon"
  | "Custom";

export interface Interaction {
  id: string;
  userId: string;
  title: string | null;
  type: InteractionType; // Stored as text in DB but typed here
  description: string | null;
  date: string; // ISO string
  createdAt: string;
  updatedAt: string;
  /** Array of participant IDs (fetched separately or joined) */
  participants?: string[];
}

export interface CreateInteractionInput {
  title?: string;
  type: string; // Allow string for flexibility
  description?: string;
  date: string;
  participantIds: string[];
}

export interface UpdateInteractionInput {
  title?: string;
  type?: string;
  description?: string;
  date?: string;
  participantIds?: string[]; // If provided, replaces existing participants
}

export type ActivityType = InteractionType;
export type Activity = Interaction;
export type CreateActivityInput = CreateInteractionInput;
export type UpdateActivityInput = UpdateInteractionInput;
