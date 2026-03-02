"use server";

import { updateTag } from "next/cache";

/**
 * Cache tags used across the webapp for on-demand revalidation.
 *
 * Each tag corresponds to a data domain. When data is mutated, call the
 * matching revalidation helper so the Next.js Data Cache serves fresh
 * responses on the next render while still caching between mutations.
 */
const CACHE_TAGS = {
  settings: "settings",
  contacts: "contacts",
  interactions: "interactions",
  groups: "groups",
  reminders: "reminders",
  relationships: "relationships",
  importantEvents: "important-events",
  mergeRecommendations: "merge-recommendations",
} as const;

/** Invalidate user settings (name, language, timezone, etc.) */
export async function revalidateSettings() {
  updateTag(CACHE_TAGS.settings);
}

/** Invalidate the contacts list and any per-contact caches. */
export async function revalidateContacts() {
  updateTag(CACHE_TAGS.contacts);
}

/** Invalidate interactions / activities. */
export async function revalidateInteractions() {
  updateTag(CACHE_TAGS.interactions);
}

/** Invalidate groups list and group membership data. */
export async function revalidateGroups() {
  updateTag(CACHE_TAGS.groups);
}

/** Invalidate upcoming reminders. */
export async function revalidateReminders() {
  updateTag(CACHE_TAGS.reminders);
}

/** Invalidate relationship data. */
export async function revalidateRelationships() {
  updateTag(CACHE_TAGS.relationships);
}

/** Invalidate important-events data. */
export async function revalidateImportantEvents() {
  updateTag(CACHE_TAGS.importantEvents);
}

/** Invalidate merge recommendation data. */
export async function revalidateMergeRecommendations() {
  updateTag(CACHE_TAGS.mergeRecommendations);
}

/**
 * Convenience helper that invalidates all data (useful after bulk operations
 * like imports or account-wide changes).
 */
export async function revalidateAll() {
  for (const tag of Object.values(CACHE_TAGS)) {
    updateTag(tag);
  }
}
