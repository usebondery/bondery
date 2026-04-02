import type { PostMeta } from "@/app/blog/_lib/types";
import type { ComponentType } from "react";

import April2026Release, {
  postMeta as april2026Release,
} from "./product/april-2026-release.mdx";
import IntroducingBondery, {
  postMeta as introducingBondery,
} from "./product/introducing-bondery.mdx";

/** Central registry of all blog posts. Add new imports here when publishing. */
export const allPosts: PostMeta[] = [april2026Release, introducingBondery];

/**
 * Maps "category/slug" to the MDX component.
 * Add a new entry here whenever you add a post to `allPosts`.
 */
export const postComponents: Record<string, ComponentType> = {
  [`${april2026Release.category}/${april2026Release.slug}`]: April2026Release,
  [`${introducingBondery.category}/${introducingBondery.slug}`]: IntroducingBondery,
};
