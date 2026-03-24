import { allPosts, postComponents } from "../../../../content/blog/posts";
import type { PostCategory, PostMeta } from "./types";
import type { ComponentType } from "react";

/** Returns all posts sorted newest-first by date. */
export function getAllPosts(): PostMeta[] {
  return [...allPosts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Returns posts filtered by category.
 * "all" returns every post; any other value filters by that category.
 */
export function getPostsByCategory(category: PostCategory): PostMeta[] {
  const posts = getAllPosts();
  if (category === "all") return posts;
  return posts.filter((p) => p.category === category);
}

/** Looks up a single post's metadata by category and slug. */
export function getPostMeta(category: string, slug: string): PostMeta | undefined {
  return allPosts.find((p) => p.category === category && p.slug === slug);
}

/** Returns all {category, slug} pairs — used by generateStaticParams. */
export function getAllSlugs(): { category: string; slug: string }[] {
  return allPosts.map((p) => ({ category: p.category, slug: p.slug }));
}

/** Returns the MDX component for a given post, or undefined if not found. */
export function getPostComponent(category: string, slug: string): ComponentType | undefined {
  return postComponents[`${category}/${slug}`];
}
