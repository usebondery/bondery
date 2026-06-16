/**
 * Shared helper functions for LinkedIn data processing.
 *
 * Used by both the redirect route (create/update contacts from extension)
 * and the enrich route (force-update existing contacts from webapp).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ScrapedWorkHistoryEntry, ScrapedEducationEntry } from "@bondery/types";
import { validateImageUpload, validateImageMagicBytes } from "./config.js";
import logger from "./logger.js";

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
  if (!val) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  if (/^\d{4}-\d{2}$/.test(val)) return `${val}-01`;
  if (/^\d{4}$/.test(val)) return `${val}-07-02`;
  return val;
}

/**
 * Downloads an image from a URL and uploads it as the contact's avatar.
 *
 * @param supabase Authenticated Supabase client.
 * @param contactId The contact's UUID.
 * @param userId The current user's UUID.
 * @param imageUrl The source URL of the profile image.
 */
export async function updateContactPhoto(
  supabase: SupabaseClient<Database>,
  contactId: string,
  userId: string,
  imageUrl: string,
): Promise<void> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return;

    const blob = await response.blob();

    const validation = validateImageUpload({
      type: blob.type,
      size: blob.size,
    });
    if (!validation.isValid) return;

    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!validateImageMagicBytes(buffer)) return;

    const fileName = `${userId}/${contactId}.jpg`;
    // Remove first to invalidate Supabase's render cache (upsert alone does not invalidate it)
    await supabase.storage.from("avatars").remove([fileName]);
    const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, buffer, {
      contentType: blob.type,
      upsert: true,
    });

    if (uploadError) return;
  } catch (error) {
    logger.error({ err: error }, "Error in updateContactPhoto");
  }
}

/**
 * Downloads an image from a URL and uploads it to the linkedin_logos storage bucket.
 * Uses upsert so re-imports overwrite the existing file without duplicates.
 *
 * @param supabase Authenticated Supabase client.
 * @param userId The current user's UUID (used as the folder name).
 * @param linkedInId The LinkedIn identifier (handle or numeric ID) used as the filename.
 * @param imageUrl The CDN URL of the logo image to download.
 * @returns The public URL of the stored logo, or null on failure.
 */
async function uploadLinkedInLogo(
  supabase: SupabaseClient<Database>,
  userId: string,
  linkedInId: string,
  imageUrl: string,
): Promise<string | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;

    const blob = await response.blob();

    const validation = validateImageUpload({
      type: blob.type,
      size: blob.size,
    });
    if (!validation.isValid) return null;

    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!validateImageMagicBytes(buffer)) return null;

    const fileName = `${userId}/${linkedInId}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("linkedin_logos")
      .upload(fileName, buffer, {
        contentType: blob.type,
        upsert: true,
      });

    if (uploadError) {
      logger.error({ err: uploadError }, "[linkedin-helpers] Failed to upload linkedin logo");
      return null;
    }

    const { data: urlData } = supabase.storage.from("linkedin_logos").getPublicUrl(fileName);
    return urlData?.publicUrl ?? null;
  } catch (error) {
    logger.error({ err: error }, "[linkedin-helpers] Error in uploadLinkedInLogo");
    return null;
  }
}

/**
 * Downloads and stores all unique LinkedIn logos from work history and education entries.
 * Returns a map of linkedInId → stored public URL for use when inserting DB rows.
 *
 * @param supabase Authenticated Supabase client.
 * @param userId The current user's UUID.
 * @param workHistory Array of scraped work history entries.
 * @param educationHistory Array of scraped education entries.
 * @returns Map of LinkedIn identifier → stored public URL.
 */
export async function uploadAllLinkedInLogos(
  supabase: SupabaseClient<Database>,
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
        tasks.push({ linkedInId: entry.companyLinkedinId, imageUrl: entry.companyLogoUrl });
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
        tasks.push({ linkedInId: entry.schoolLinkedinId, imageUrl: entry.schoolLogoUrl });
      }
    }
  }

  if (tasks.length === 0) return logoMap;

  const results = await Promise.all(
    tasks.map(async ({ linkedInId, imageUrl }) => {
      const publicUrl = await uploadLinkedInLogo(supabase, userId, linkedInId, imageUrl);
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
