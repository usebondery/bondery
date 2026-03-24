import fs from "fs";
import path from "path";
import { getReadingTime } from "@bondery/helpers";

/**
 * Reads the raw MDX file from disk and returns estimated reading time.
 * **Server-only** — uses Node.js `fs`; never import from client components.
 *
 * @param category - The blog post category (folder name).
 * @param slug - The blog post slug (filename without extension).
 * @returns Reading time in minutes (minimum 1).
 */
export function getPostReadingTime(category: string, slug: string): number {
  try {
    const filePath = path.join(process.cwd(), "content", "blog", category, `${slug}.mdx`);
    const content = fs.readFileSync(filePath, "utf-8");
    return getReadingTime(content).minutes;
  } catch {
    return 1;
  }
}
