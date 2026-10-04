import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateFiles } from "fumadocs-openapi";
import { openapi } from "../src/lib/openapi.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");

async function main() {
  await generateFiles({
    addGeneratedComment: true,
    groupBy: "route",
    includeDescription: true,
    input: openapi,
    meta: true,
    output: join(repoRoot, "docs/api/api-reference/_generated"),
    per: "operation",
  });
}

main().catch((error: unknown) => {
  console.error("Failed to generate API docs:", error);
  process.exit(1);
});
