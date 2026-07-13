import type { PaginationMeta } from "../_shared/types.js";

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

export interface InteractionParticipant {
  avatar: string | null;
  firstName: string;
  id: string;
  lastName: string | null;
  updatedAt?: string;
}

export interface Interaction {
  createdAt: string;
  date: string;
  description: string | null;
  id: string;
  participants?: InteractionParticipant[] | string[];
  title: string | null;
  type: InteractionType;
  updatedAt: string;
  userId: string;
}

export interface CreateInteractionInput {
  date: string;
  description?: string;
  participantIds: string[];
  title?: string;
  type: InteractionType;
}

export interface UpdateInteractionInput {
  date?: string;
  description?: string;
  participantIds?: string[];
  title?: string;
  type?: InteractionType;
}

export interface InteractionFormInput {
  date: string;
  description: string;
  participantIds: string[];
  title: string;
  type: string;
}

export interface InteractionsListResponse {
  interactions: Interaction[];
  pagination: PaginationMeta;
}

export type ActivityType = InteractionType;
export type Activity = Interaction;
export type CreateActivityInput = CreateInteractionInput;
export type UpdateActivityInput = UpdateInteractionInput;
