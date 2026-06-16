/** Supported blog categories. "all" is a virtual filter showing every post. */
export type PostCategory = "all" | "product" | "bonds";

/** Metadata exported from each blog MDX file via `export const postMeta`. */
export type PostMeta = {
  title: string;
  /** URL-safe slug — must match the MDX filename (without .mdx) */
  slug: string;
  /** ISO date string, e.g. "2026-03-22" */
  date: string;
  /** ISO date string of last modification. Falls back to `date` when absent. */
  modifiedDate?: string;
  /** Short excerpt shown in blog cards and meta description (max 160 chars) */
  description: string;
  /** Must match the folder name under content/blog/ */
  category: Exclude<PostCategory, "all">;
  /** Optional author name */
  author?: string;
  /** Topic tags used for OG article:tag and meta keywords */
  tags?: string[];
  /**
   * Controls whether and where this post gets announced when published.
   * Omitting this field (or setting enabled: false) silently skips the post
   * in the announce pipeline. Both discord and reddit default to true when
   * enabled is true and the sub-flag is omitted.
   */
  announce?: {
    /** Master opt-in. Must be true for the post to be announced. */
    enabled: boolean;
    /** Set to false to skip Discord for this specific post. Defaults to true. */
    discord?: boolean;
    /** Set to false to skip Reddit for this specific post. Defaults to true. */
    reddit?: boolean;
    /**
     * Subreddit to post to (without the r/ prefix). Defaults to "bondery" for
     * all categories. Override when posting to a category-specific community.
     */
    subreddit?: string;
    /** Overrides postMeta.title as the Reddit submission title. */
    redditTitle?: string;
    /** Optional flair text for the Reddit submission. */
    redditFlair?: string;
  };
};
