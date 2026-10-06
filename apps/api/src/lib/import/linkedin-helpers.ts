/**
 * Shared helper functions for LinkedIn data processing.
 *
 * Used by both the redirect route (create/update contacts from extension)
 * and the enrich route (force-update existing contacts from webapp).
 */

import { type PrismaClient, prisma } from "@bondery/db";
import type { ScrapedEducationEntry, ScrapedWorkHistoryEntry } from "@bondery/schemas";
import { uploadContactAvatarAndSetFlag } from "../contacts/avatar-storage.js";
import { validateImageMagicBytes, validateImageUpload } from "../platform/config.js";
import logger from "../platform/logger.js";
import { getStorage, LINKEDIN_LOGOS_BUCKET } from "../storage/get-storage.js";
import { LINKEDIN_LOGO_MAX_EDGE, normalizeImageToJpeg } from "../storage/normalize-image.js";

/**
 * Converts a loose date string (YYYY, YYYY-MM, or YYYY-MM-DD) into a
 * Postgres-safe date string (always YYYY-MM-DD).
 *
 * - YYYY-MM-DD → returned as-is
 * - YYYY-MM → padded to YYYY-MM-01
 * - YYYY → stored as YYYY-07-02 (day=02 is a precision sentinel; month-precise dates use day=01)
 *
 * @param val The loose date string to normalise.
 * @returns A Postgres-compatible date string, or null if the input is empty.
 */
export function toPostgresDate(val: string | null | undefined): string | null {
  if (!val) {
    return null;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    return val;
  }
  if (/^\d{4}-\d{2}$/.test(val)) {
    return `${val}-01`;
  }
  if (/^\d{4}$/.test(val)) {
    return `${val}-07-02`;
  }
  return val;
}

function parseOptionalDate(value: string | null | undefined): Date | null {
  const normalized = toPostgresDate(value);
  if (!normalized) {
    return null;
  }
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Upserts `people_linkedin` and replaces work/education rows.
 * Import and enrich must use this Prisma path so history is not dropped.
 */
export async function upsertLinkedInHistory(
  db: PrismaClient,
  userId: string,
  personId: string,
  linkedinBio: string | null | undefined,
  workHistory: ScrapedWorkHistoryEntry[] | undefined,
  educationHistory: ScrapedEducationEntry[] | undefined,
): Promise<void> {
  const hasWork = Boolean(workHistory && workHistory.length > 0);
  const hasEducation = Boolean(educationHistory && educationHistory.length > 0);
  if (!hasWork && !hasEducation && !linkedinBio) {
    return;
  }

  const linkedinRow = await db.peopleLinkedin.upsert({
    create: {
      bio: linkedinBio ?? null,
      personId,
      userId,
    },
    update: {
      ...(linkedinBio ? { bio: linkedinBio } : {}),
      updatedAt: new Date(),
    },
    where: { personId },
  });

  if (hasWork && workHistory) {
    await db.peopleWorkHistory.deleteMany({
      where: { peopleLinkedinId: linkedinRow.id, userId },
    });
    await db.peopleWorkHistory.createMany({
      data: workHistory.map((entry) => ({
        companyLinkedinId: entry.companyLinkedinId ?? null,
        companyName: entry.companyName,
        description: entry.description ?? null,
        employmentType: entry.employmentType ?? null,
        endDate: parseOptionalDate(entry.endDate),
        location: entry.location ?? null,
        peopleLinkedinId: linkedinRow.id,
        startDate: parseOptionalDate(entry.startDate),
        title: entry.title ?? null,
        userId,
      })),
    });
  }

  if (hasEducation && educationHistory) {
    await db.peopleEducationHistory.deleteMany({
      where: { peopleLinkedinId: linkedinRow.id, userId },
    });
    await db.peopleEducationHistory.createMany({
      data: educationHistory.map((entry) => ({
        degree: entry.degree ?? null,
        description: entry.description ?? null,
        endDate: parseOptionalDate(entry.endDate),
        peopleLinkedinId: linkedinRow.id,
        schoolLinkedinId: entry.schoolLinkedinId ?? null,
        schoolName: entry.schoolName,
        startDate: parseOptionalDate(entry.startDate),
        userId,
      })),
    });
  }
}

/**
 * Downloads an image from a URL and uploads it as the contact's avatar.
 */
export async function updateContactPhoto(
  contactId: string,
  userId: string,
  imageUrl: string,
): Promise<void> {
  try {
    const response = await fetch(imageUrl, { signal: AbortSignal.timeout(8_000) });
    if (!response.ok) {
      return;
    }

    const blob = await response.blob();

    const validation = validateImageUpload({
      size: blob.size,
      type: blob.type,
    });
    if (!validation.isValid) {
      return;
    }

    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!validateImageMagicBytes(buffer)) {
      return;
    }

    await uploadContactAvatarAndSetFlag(prisma, userId, contactId, buffer, blob.type);
  } catch (error) {
    logger.error({ err: error }, "Error in updateContactPhoto");
  }
}

/**
 * Downloads an image from a URL and uploads it to the linkedin-logos storage bucket.
 * Uses upsert so re-imports overwrite the existing file without duplicates.
 *
 * @returns The public URL of the stored logo, or null on failure.
 */
async function uploadLinkedInLogo(
  userId: string,
  linkedInId: string,
  imageUrl: string,
): Promise<string | null> {
  try {
    const response = await fetch(imageUrl, { signal: AbortSignal.timeout(8_000) });
    if (!response.ok) {
      return null;
    }

    const blob = await response.blob();

    const validation = validateImageUpload({
      size: blob.size,
      type: blob.type,
    });
    if (!validation.isValid) {
      return null;
    }

    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!validateImageMagicBytes(buffer)) {
      return null;
    }

    const fileName = `${userId}/${linkedInId}.jpg`;
    const storage = getStorage();
    const normalized = await normalizeImageToJpeg(buffer, { maxEdge: LINKEDIN_LOGO_MAX_EDGE });
    await storage.put(LINKEDIN_LOGOS_BUCKET, fileName, normalized, { contentType: "image/jpeg" });
    return storage.getPublicUrl(LINKEDIN_LOGOS_BUCKET, fileName);
  } catch (error) {
    logger.error({ err: error }, "[linkedin-helpers] Error in uploadLinkedInLogo");
    return null;
  }
}

/**
 * Downloads and stores all unique LinkedIn logos from work history and education entries.
 * Returns a map of linkedInId → stored public URL for use when inserting DB rows.
 */
export async function uploadAllLinkedInLogos(
  userId: string,
  workHistory: ScrapedWorkHistoryEntry[] | undefined,
  educationHistory: ScrapedEducationEntry[] | undefined,
): Promise<Map<string, string>> {
  const logoMap = new Map<string, string>();
  const tasks: Array<{ linkedInId: string; imageUrl: string }> = [];

  if (workHistory) {
    for (const entry of workHistory) {
      if (
        entry.companyLinkedinId &&
        entry.companyLogoUrl &&
        !tasks.some((t) => t.linkedInId === entry.companyLinkedinId)
      ) {
        tasks.push({ imageUrl: entry.companyLogoUrl, linkedInId: entry.companyLinkedinId });
      }
    }
  }

  if (educationHistory) {
    for (const entry of educationHistory) {
      if (
        entry.schoolLinkedinId &&
        entry.schoolLogoUrl &&
        !tasks.some((t) => t.linkedInId === entry.schoolLinkedinId)
      ) {
        tasks.push({ imageUrl: entry.schoolLogoUrl, linkedInId: entry.schoolLinkedinId });
      }
    }
  }

  if (tasks.length === 0) {
    return logoMap;
  }

  const results = await Promise.all(
    tasks.map(async ({ linkedInId, imageUrl }) => {
      const publicUrl = await uploadLinkedInLogo(userId, linkedInId, imageUrl);
      return { linkedInId, publicUrl };
    }),
  );

  for (const { linkedInId, publicUrl } of results) {
    if (publicUrl) {
      logoMap.set(linkedInId, publicUrl);
    }
  }

  return logoMap;
}
