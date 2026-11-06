import { existsSync, readFileSync } from "node:fs";
import { join, normalize, relative, resolve } from "node:path";
import { glob } from "tinyglobby";

const ROOT = join(process.cwd(), "../..");
const DOCS_DIR = join(ROOT, "docs");

const FENCE = /^\s*(`{3,}|~{3,})/;

type Broken = { file: string; line: number; target: string; resolved: string };

/**
 * Link targets, allowing one level of nested parentheses.
 *
 * Repository paths such as `apps/webapp/src/app/(app)/...` contain parentheses,
 * so a naive `[^)]+` match truncates the target.
 */
function linkTargets(line: string): string[] {
  const targets: string[] = [];
  const marker = "](";

  let at = line.indexOf(marker);
  while (at >= 0) {
    let depth = 1;
    let index = at + marker.length;

    for (; index < line.length; index += 1) {
      const char = line[index];
      if (char === "(") {
        depth += 1;
      } else if (char === ")") {
        depth -= 1;
        if (depth === 0) {
          break;
        }
      }
    }

    if (depth !== 0) {
      break;
    }

    const target = line.slice(at + marker.length, index);
    if (target.length > 0) {
      targets.push(target);
    }
    at = line.indexOf(marker, index);
  }

  return targets;
}

function isSkipped(target: string): boolean {
  return (
    target.startsWith("http://") ||
    target.startsWith("https://") ||
    target.startsWith("mailto:") ||
    target.startsWith("tel:") ||
    target.startsWith("#")
  );
}

/** `true` when the path exists as a file, a `.mdx` sibling, or a folder index. */
function exists(path: string): boolean {
  return (
    existsSync(path) ||
    existsSync(`${path}.mdx`) ||
    existsSync(`${path}.md`) ||
    existsSync(join(path, "index.mdx"))
  );
}

async function main() {
  const files = await glob("**/*.mdx", { absolute: true, cwd: DOCS_DIR });
  const broken: Broken[] = [];

  for (const file of files) {
    const text = readFileSync(file, "utf8");
    let fence: string | undefined;

    for (const [index, line] of text.split("\n").entries()) {
      const marker = FENCE.exec(line)?.[1];
      if (marker) {
        fence = fence === undefined ? marker : undefined;
        continue;
      }
      if (fence !== undefined) {
        continue;
      }

      for (const raw of linkTargets(line)) {
        if (isSkipped(raw) || raw.startsWith("/")) {
          continue;
        }

        const target = raw.split("#")[0]?.split("?")[0] ?? "";
        if (target.length === 0 || target.endsWith("/")) {
          continue;
        }

        const resolved = normalize(resolve(file, "..", target));

        if (!exists(resolved)) {
          broken.push({
            file: relative(ROOT, file).replace(/\\/g, "/"),
            line: index + 1,
            resolved: relative(ROOT, resolved).replace(/\\/g, "/"),
            target: raw,
          });
        }
      }
    }
  }

  if (broken.length === 0) {
    console.log(`docs link targets ok (${files.length} files)`);
    return;
  }

  for (const item of broken) {
    console.log(`${item.file}:${item.line}  ${item.target}  ->  ${item.resolved}`);
  }
  console.log(
    `\n${broken.length} broken target(s) in ${new Set(broken.map((b) => b.file)).size} file(s)`,
  );
  process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
