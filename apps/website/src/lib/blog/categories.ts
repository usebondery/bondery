import blog from "@bondery/translations/locales/en/platform/website/WebsiteBlog.json" with {
  type: "json",
};
import { type Icon, IconCpu, IconHistory, IconTopologyStar } from "@tabler/icons-react";
import type { PostCategory } from "@/lib/blog/types";
import { formatText } from "@/lib/i18n/message";

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
 *   1. Add it to the PostCategory union in src/app/blog/_lib/types.ts.
 *   2. Add a BlogCategoryConfig entry in src/lib/blog/categories.ts.
 *   3. Create the matching folder under content/blog/<slug>/.
 */
export const updatesCategoryConfig: BlogCategoryConfig = {
  discordTagId: "1485722208033702041",
  discordThreadName: "Updates",
  emoji: "⭐",
  icon: IconHistory,
  label: blog.Categories.Updates,
  redditFlairId: "d66897b8-26fc-11f1-9219-7272b72b91c8",
  slug: "updates",
};

export const techCategoryConfig: BlogCategoryConfig = {
  discordTagId: "",
  discordThreadName: "Tech",
  emoji: "🔧",
  icon: IconCpu,
  label: blog.Categories.Tech,
  redditFlairId: "ae9b6d5e-8c29-11f1-88c8-92e274031672",
  slug: "tech",
};

export const bondsCategoryConfig: BlogCategoryConfig = {
  discordTagId: "1485722290892177620",
  discordThreadName: "Community & Bonds",
  emoji: "🟣",
  icon: IconTopologyStar,
  label: blog.Categories.Bonds,
  redditFlairId: "fac36e08-26fc-11f1-abe0-420e135784a5",
  slug: "bonds",
};

export const BLOG_CATEGORY_CONFIGS: BlogCategoryConfig[] = [
  updatesCategoryConfig,
  techCategoryConfig,
  bondsCategoryConfig,
];

/** Look up a category's full config by slug. Returns undefined for "all" or unknown slugs. */
export function getCategoryConfig(slug: string): BlogCategoryConfig | undefined {
  return BLOG_CATEGORY_CONFIGS.find((c) => c.slug === slug);
}

/** Display title for blog index / category pages (metadata + OG images). */
export function getBlogCategoryTitle(category: string): string {
  if (category === "all") {
    return blog.Title;
  }

  const config = getCategoryConfig(category);
  if (config) {
    return formatText(blog.CategoryTitle, { category: config.label });
  }

  return formatText(blog.CategoryTitle, {
    category: `${category.charAt(0).toUpperCase()}${category.slice(1)}`,
  });
}

/** All categories including the virtual "all" filter. */
export const BLOG_CATEGORIES: PostCategory[] = ["all", ...BLOG_CATEGORY_CONFIGS.map((c) => c.slug)];

/** Icon map keyed by category slug (excludes "all"). */
export const CATEGORY_ICONS: Partial<Record<PostCategory, Icon>> = Object.fromEntries(
  BLOG_CATEGORY_CONFIGS.map((c) => [c.slug, c.icon]),
) as Partial<Record<PostCategory, Icon>>;
