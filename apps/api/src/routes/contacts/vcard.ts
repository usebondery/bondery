/**
 * vCard Generation Utility
 * Generates vCard 4.0 formatted files from contact data
 */

import type { Contact } from "@bondery/types";
import { attachMedia, contactToVCard, serializeVCard } from "@bondery/vcard";
import logger from "../../lib/logger.js";

function formatVCardTimestamp(dateString: string | null): string | null {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    const hours = String(date.getUTCHours()).padStart(2, "0");
    const minutes = String(date.getUTCMinutes()).padStart(2, "0");
    const seconds = String(date.getUTCSeconds()).padStart(2, "0");
    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
  } catch {
    return null;
  }
}

export async function generateVCard(contact: Contact): Promise<string> {
  let card = contactToVCard(contact);

  if (contact.avatar) {
    try {
      if (contact.avatar.trim()) {
        card = attachMedia(card, "PHOTO", { uri: contact.avatar.trim() });
      }
    } catch (error) {
      logger.error({ err: error }, "Failed to attach avatar URI for vCard");
    }
  }

  const revision = formatVCardTimestamp(contact.updatedAt ?? contact.createdAt);
  if (revision) {
    card = {
      ...card,
      revision,
    };
  }

  return serializeVCard(card);
}
