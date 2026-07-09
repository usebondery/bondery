import { productCategoryConfig } from "../../../src/app/blog/_lib/categories";
import type { PostMeta } from "../../../src/app/blog/_lib/types";
import { sveetya } from "../../../src/data/team";

/**
 * Metadata for the April 2026 (v1.4.0) monthly release blog post.
 * Imported by both the MDX file (for Next.js) and metadata.ts (for the announce script).
 */
export const postMeta: PostMeta = {
  announce: {
    enabled: true,
  },
  author: sveetya.name,
  category: productCategoryConfig.slug,
  date: "2026-04-01",
  description:
    "Bondery v1.4.0 brings keep-in-touch reminders, Instagram import, vCard support, a Myself contact, and user preferences.",
  slug: "april-2026-release",
  tags: [
    "release",
    "keep-in-touch",
    "Instagram import",
    "vCard",
    "reminders",
    "PRM",
    "open source",
  ],
  title: "April 2026 Release: Keep-in-Touch, Instagram Import & More",
};
