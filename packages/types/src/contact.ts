/**
 * Contact Domain Types
 * Types for contact/person management
 */

import type { Json } from "./database";

/**
 * Important date associated with a contact
 */
export interface ImportantDate {
  id: string;
  name: string;
  date: string;
  notify: boolean;
}

/**
 * Geographic position for contact
 */
export interface Position {
  lat: number;
  lng: number;
}

/**
 * Contact entity - represents a person in the user's network
 * Uses camelCase for API/frontend consumption
 */
export interface Contact {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string | null;
  title: string | null;
  place: string | null;
  description: string | null;
  notes: string | null;
  avatarColor: string | null;
  avatar: string | null;
  lastInteraction: string | null;
  createdAt: string;
  connections: string[] | null;
  phone: string | null;
  email: string | null;
  linkedin: string | null;
  instagram: string | null;
  whatsapp: string | null;
  facebook: string | null;
  website: string | null;
  signal: string | null;
  birthdate: string | null;
  notifyBirthday: boolean | null;
  importantDates: ImportantDate[] | Json | null;
  myself: boolean | null;
  position: Position | Json | null;
}

/**
 * Data required to create a new contact
 */
export interface CreateContactInput {
  firstName: string;
  lastName: string;
  linkedin?: string;
}

/**
 * Data for updating an existing contact (all fields optional)
 */
export type UpdateContactInput = Partial<Omit<Contact, "id" | "createdAt">>;

/**
 * Response from contacts list endpoint
 */
export interface ContactsListResponse {
  contacts: Contact[];
  totalCount: number;
}

/**
 * Response from single contact fetch
 */
export interface ContactResponse {
  contact: Contact;
}

/**
 * Request body for deleting multiple contacts
 */
export interface DeleteContactsRequest {
  ids: string[];
}
