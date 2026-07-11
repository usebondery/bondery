export type ContactNameFields = {
  firstName: string;
  middleName?: string | null;
  lastName?: string | null;
};

/**
 * Formats a contact's display name from structured name fields.
 * Trims each part and joins with spaces. Returns an empty string when all parts are blank.
 */
export function formatContactName(contact: ContactNameFields): string {
  const firstName = contact.firstName?.trim() ?? "";
  const middleName = contact.middleName?.trim() ?? "";
  const lastName = contact.lastName?.trim() ?? "";

  return [firstName, middleName, lastName].filter(Boolean).join(" ");
}
