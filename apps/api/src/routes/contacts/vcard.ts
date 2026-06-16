/**
 * vCard Generation Utility
 * Generates vCard 4.0 formatted files from contact data
 */

import type { Contact } from "@bondery/types";
import { attachMedia, contactToVCard, serializeVCard } from "@bondery/vcard";
import logger from "../../lib/logger.js";

type VCardExportImportantDate = {
  type: "birthday" | "anniversary" | "nameday" | "graduation" | "other";
  date: string;
};

type VCardExportExtras = {
  importantDates?: VCardExportImportantDate[];
  categories?: string[];
};

function formatVCardDate(dateString: string | null | undefined): string | null {
  if (!dateString) return null;

  const normalized = dateString.trim();
  const dashDateMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dashDateMatch) {
    return `${dashDateMatch[1]}${dashDateMatch[2]}${dashDateMatch[3]}`;
  }

  const compactDateMatch = normalized.match(/^\d{8}$/);
  if (compactDateMatch) {
    return normalized;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const day = String(parsed.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

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

export async function generateVCard(contact: Contact, extras?: VCardExportExtras): Promise<string> {
  let card = contactToVCard(contact);

  const birthdayDate = extras?.importantDates?.find((entry) => entry.type === "birthday")?.date;
  const anniversaryDate = extras?.importantDates?.find(
    (entry) => entry.type === "anniversary",
  )?.date;

  const bday = formatVCardDate(birthdayDate);
  const anniversary = formatVCardDate(anniversaryDate);

  const categories = Array.from(
    new Set((extras?.categories ?? []).map((value) => value.trim()).filter(Boolean)),
  );

  card = {
    ...card,
    birthday: bday ? { value: bday, valueType: "date-and-or-time" } : undefined,
    anniversary: anniversary ? { value: anniversary, valueType: "date-and-or-time" } : undefined,
    categories,
  };

  if (contact.avatar) {
    const avatarUrl = contact.avatar.trim();
    if (avatarUrl) {
      try {
        const response = await fetch(avatarUrl);
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          const mediaType = response.headers.get("content-type") ?? "image/jpeg";
          card = attachMedia(card, "PHOTO", { data: buffer, mediaType });
        } else {
          logger.warn({ status: response.status, url: avatarUrl }, "Failed to fetch avatar for vCard embedding");
        }
      } catch (error) {
        logger.error({ err: error }, "Failed to fetch and embed avatar for vCard");
      }
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
