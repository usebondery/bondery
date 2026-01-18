import type { Contact } from "./mockData";

/**
 * Formats a contact's full name with proper spacing
 * @param contact - Contact object or contact fields
 * @returns Formatted full name
 */
export function formatContactName(
  contact: Contact | { firstName: string; middleName?: string; lastName: string },
): string {
  const parts = [contact.firstName, contact.middleName, contact.lastName].filter(Boolean);

  return parts.join(" ");
}
