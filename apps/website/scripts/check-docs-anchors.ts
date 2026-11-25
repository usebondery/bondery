import { readFileSync } from "node:fs";
import { join } from "node:path";
import GithubSlugger from "github-slugger";
import { glob } from "tinyglobby";

const DOCS_DIR = join(process.cwd(), "../../docs");
const MIN_PAGES = 326;

async function main() {
  const files = await glob("**/*.mdx", { absolute: true, cwd: DOCS_DIR });

  if (files.length < MIN_PAGES) {
    console.error(`Expected at least ${MIN_PAGES} docs pages, found ${files.length}`);
    process.exitCode = 1;
    return;
  }

  let duplicates = 0;

  for (const file of files) {
    const slugger = new GithubSlugger();
    const seen = new Set<string>();
    const text = readFileSync(file, "utf8");

    for (const match of text.matchAll(/^#{1,6}\s+(?<group1>.+)$/gmu)) {
      const heading = match[1]?.replace(/[*_`[\]]/gu, "").trim() ?? "";
      const id = slugger.slug(heading);
      if (seen.has(id)) {
        duplicates += 1;
        console.error(`${file} duplicate heading id: ${id}`);
      }
      seen.add(id);
    }
  }

  if (duplicates > 0) {
    process.exitCode = 1;
    return;
  }

  console.log(`docs anchors ok (${files.length} pages)`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
