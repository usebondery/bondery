import type { PostMeta } from "@/app/blog/_lib/types";
import type { ComponentType } from "react";

import IntroducingBondery, {
  postMeta as introducingBondery,
} from "./product/introducing-bondery.mdx";

/** Central registry of all blog posts. Add new imports here when publishing. */
export const allPosts: PostMeta[] = [introducingBondery];

/**
 * Maps "category/slug" to the MDX component.
 * Add a new entry here whenever you add a post to `allPosts`.
 */
export const postComponents: Record<string, ComponentType> = {
  [`${introducingBondery.category}/${introducingBondery.slug}`]: IntroducingBondery,
};
