import type { PostMeta } from "@/app/blog/_lib/types";

import { postMeta as introducingBondery } from "./product/introducing-bondery.meta";

/**
 * Thin metadata-only registry — plain PostMeta objects, no MDX component imports.
 * Used by the announce script (scripts/announce.ts) which runs via tsx and cannot
 * process MDX. When adding a new post, add its postMeta import here AND the full
 * MDX component import in posts.ts.
 */
export const allPostMeta: PostMeta[] = [introducingBondery];
