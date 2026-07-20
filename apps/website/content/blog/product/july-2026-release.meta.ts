import { productCategoryConfig } from "../../../src/app/blog/_lib/categories";
import type { PostMeta } from "../../../src/app/blog/_lib/types";
import { sveetya } from "../../../src/data/team";

/**
 * Metadata for the July 2026 (v1.7.4) monthly release blog post.
 * Imported by both the MDX file (for Next.js) and metadata.ts (for the announce script).
 */
export const postMeta: PostMeta = {
  announce: {
    enabled: true,
  },
  author: sveetya.name,
  category: productCategoryConfig.slug,
  date: "2026-07-20",
  description:
    "Bondery v1.7.4 brings German language support, a more stable LinkedIn extension, email sharing, a desktop PWA, and backend infrastructure work.",
  slug: "july-2026-release",
  tags: ["release", "German", "localization", "LinkedIn extension", "PWA", "self-hosting", "PRM"],
  title: "July 2026 Release: German Support, a Sturdier LinkedIn Extension & More",
};
