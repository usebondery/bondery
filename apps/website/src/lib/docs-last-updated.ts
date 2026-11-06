import type { Page } from "@/lib/source";

/**
 * Calendar date of the last substantive edit, from the `last_updated`
 * frontmatter field.
 *
 * The date is authored by hand, not derived from Git history:
 *
 * - A typo fix is not a content change, so the date must stay put.
 * - A derived date needs Git history or a GitHub token in every build.
 *
 * `pnpm run check:docs:frontmatter` fails when a published page has no date, or
 * when the date is not a real `YYYY-MM-DD` calendar date.
 */
export function getDocsLastUpdated(page: Page): string | null {
  const value = page.data.last_updated?.trim();
  return value ? value : null;
}
