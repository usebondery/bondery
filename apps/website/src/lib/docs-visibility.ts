import { isUnpublishedChangelogSlug } from "@/lib/changelog";
import type { Page } from "@/lib/source";

/**
 * Pages that may appear in public agent surfaces (`llms.txt`, `llms-full.txt`,
 * `/docs/*.md`, `sitemap.xml`). Hidden pages and the unpublished changelog are
 * reachable only in the docs UI when a reader types the URL.
 */
export function isPublishedDocsPage(page: Page): boolean {
  return page.data.hidden !== true && !isUnpublishedChangelogSlug(page.slugs);
}
