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
  | "Networking event"
  | "Note"
  | "Other"
  | "Party/Social"
  | "Text/Messaging"
  | "Competition/Hackathon"
  | "Custom";

/**
 * Lightweight participant shape embedded in Interaction objects returned by the API.
 * The API joins people data directly onto each interaction (snake_case from the DB).
 */
export interface InteractionParticipant {
  id: string;
  first_name: string;
  last_name: string | null;
  avatar: string | null;
  updated_at?: string;
}

export interface Interaction {
  id: string;
  userId: string;
  title: string | null;
  type: InteractionType; // Stored as text in DB but typed here
  description: string | null;
  date: string; // ISO string
  createdAt: string;
  updatedAt: string;
  /**
   * Participants embedded by the API as lightweight objects (snake_case).
   * May also be a plain string ID array when used programmatically.
   */
  participants?: InteractionParticipant[] | string[];
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
