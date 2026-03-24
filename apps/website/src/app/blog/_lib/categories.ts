import { IconStar, IconTopologyStar, type Icon } from "@tabler/icons-react";

import type { PostCategory } from "./types";

/** Full configuration for a blog category. */
export type BlogCategoryConfig = {
  /** The slug used in URLs and PostMeta.category — must match the folder name under content/blog/. */
  slug: Exclude<PostCategory, "all">;
  /** Human-readable display label. */
  label: string;
  /** Tabler icon component shown in the UI. */
  icon: Icon;
  /** Emoji used in Discord announcements and as a compact visual marker. */
  emoji: string;
  /** Thread name prefix used when posting to a Discord forum channel. */
  discordThreadName: string;
  /** Tag ID to apply when creating threads in the Discord forum channel. */
  discordTagId: string;
  /** Link flair template UUID to attach when submitting to the subreddit. */
  redditFlairId: string;
};

/**
 * Single source of truth for all blog category definitions.
 * When adding a new category:
 *   1. Add it to the PostCategory union in types.ts.
 *   2. Add a BlogCategoryConfig entry here.
 *   3. Create the matching folder under content/blog/<slug>/.
 */
export const productCategoryConfig: BlogCategoryConfig = {
  slug: "product",
  label: "Product",
  icon: IconStar,
  emoji: "⭐",
  discordThreadName: "Product Updates",
  discordTagId: "1485722208033702041",
  redditFlairId: "d66897b8-26fc-11f1-9219-7272b72b91c8",
};

export const bondsCategoryConfig: BlogCategoryConfig = {
  slug: "bonds",
  label: "Bonds",
  icon: IconTopologyStar,
  emoji: "🟣",
  discordThreadName: "Community & Bonds",
  discordTagId: "1485722290892177620",
  redditFlairId: "fac36e08-26fc-11f1-abe0-420e135784a5",
};

export const BLOG_CATEGORY_CONFIGS: BlogCategoryConfig[] = [
  productCategoryConfig,
  bondsCategoryConfig,
];

/** Look up a category's full config by slug. Returns undefined for "all" or unknown slugs. */
export function getCategoryConfig(slug: string): BlogCategoryConfig | undefined {
  return BLOG_CATEGORY_CONFIGS.find((c) => c.slug === slug);
}

// ---------------------------------------------------------------------------
// Backward-compatible shape — keeps existing callers working without changes.
// ---------------------------------------------------------------------------

/** All categories including the virtual "all" filter. */
export const BLOG_CATEGORIES: PostCategory[] = ["all", ...BLOG_CATEGORY_CONFIGS.map((c) => c.slug)];

/** Icon map keyed by category slug (excludes "all"). */
export const CATEGORY_ICONS: Partial<Record<PostCategory, Icon>> = Object.fromEntries(
  BLOG_CATEGORY_CONFIGS.map((c) => [c.slug, c.icon]),
) as Partial<Record<PostCategory, Icon>>;
