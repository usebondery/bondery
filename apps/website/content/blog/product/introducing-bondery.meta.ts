import type { PostMeta } from "../../../src/app/blog/_lib/types";
import { productCategoryConfig } from "../../../src/app/blog/_lib/categories";
import { sveetya } from "../../../src/data/team";

/**
 * Metadata for the "Introducing Bondery" blog post.
 * Imported by both the MDX file (for Next.js) and metadata.ts (for the announce script).
 */
export const postMeta: PostMeta = {
  title: "Introducing Bondery",
  slug: "introducing-bondery",
  date: "2026-03-22",
  description:
    "Meet Bondery: the open-source Personal Relationship Manager that helps you build a better network.",
  category: productCategoryConfig.slug,
  author: sveetya.name,
  tags: ["PRM", "personal CRM", "relationship management", "open source", "networking"],
  announce: {
    enabled: true,
  },
};
