/**
 * Ensures every page with generateMetadata has a matching client title registry entry.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DYNAMIC_ROUTE_PAGE_SEGMENTS,
  listStaticRouteTitlePaths,
} from "../src/lib/metadata/routeTitleRegistry";
import { primaryAppNavLinks, secondaryAppNavLinks } from "../src/lib/navigation/appNavLinks";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_PAGES_ROOT = join(__dirname, "..", "src", "app", "(app)", "app");

type Violation = { file: string; detail: string };

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, acc);
    } else if (entry === "page.tsx") {
      acc.push(full);
    }
  }
  return acc;
}

function normalizeRel(rel: string): string {
  return rel.replace(/\\/g, "/");
}

function pageSegmentToRoutePath(segment: string): string {
  return `/app/${segment}`;
}

function classifyPage(segment: string): "static" | "dynamic" | "unknown" {
  if ((DYNAMIC_ROUTE_PAGE_SEGMENTS as readonly string[]).includes(segment)) {
    return "dynamic";
  }
  return "static";
}

function main(): void {
  const violations: Violation[] = [];
  const staticPaths = new Set(listStaticRouteTitlePaths());
  const pageFiles = walk(APP_PAGES_ROOT);

  for (const absPath of pageFiles) {
    const rel = normalizeRel(relative(join(__dirname, "..", "src"), absPath));
    const content = readFileSync(absPath, "utf8");

    if (!/export\s+async\s+function\s+generateMetadata/.test(content)) {
      continue;
    }

    const segment = normalizeRel(relative(APP_PAGES_ROOT, absPath)).replace("/page.tsx", "");
    const kind = classifyPage(segment);

    if (kind === "dynamic") {
      continue;
    }

    const routePath = pageSegmentToRoutePath(segment);
    if (!staticPaths.has(routePath)) {
      violations.push({
        detail: `No static route title registry entry for ${routePath}`,
        file: rel,
      });
    }
  }

  for (const link of [...primaryAppNavLinks, ...secondaryAppNavLinks]) {
    if (!staticPaths.has(link.href)) {
      violations.push({
        detail: `Nav link ${link.href} is missing from route title registry`,
        file: "lib/navigation/appNavLinks.ts",
      });
    }
  }

  if (violations.length === 0) {
    console.log("check-route-titles: OK");
    return;
  }

  console.error("check-route-titles: violations found\n");
  for (const v of violations) {
    console.error(`  ${v.file}\n    ${v.detail}`);
  }
  process.exit(1);
}

main();
