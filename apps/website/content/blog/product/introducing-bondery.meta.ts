import { productCategoryConfig } from "../../../src/app/blog/_lib/categories";
import type { PostMeta } from "../../../src/app/blog/_lib/types";
import { sveetya } from "../../../src/data/team";

/**
 * Metadata for the "Introducing Bondery" blog post.
 * Imported by both the MDX file (for Next.js) and metadata.ts (for the announce script).
 */
export const postMeta: PostMeta = {
  announce: {
    enabled: true,
  },
  author: sveetya.name,
  category: productCategoryConfig.slug,
  date: "2026-03-22",
  description:
    "Meet Bondery: the open-source Personal Relationship Manager that helps you build a better network.",
  slug: "introducing-bondery",
  tags: ["PRM", "personal CRM", "relationship management", "open source", "networking"],
  title: "Introducing Bondery",
};
