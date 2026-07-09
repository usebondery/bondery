/**
 * Guards feature route folder structure in the webapp.
 * Run via: npm run check-route-structure
 */
import { readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEBAPP_SRC = join(__dirname, "..", "src");
const APP_ROUTES = join(WEBAPP_SRC, "app", "(app)", "app");
const STRICT = process.env.CHECK_ROUTE_STRUCTURE_STRICT === "1";

type Violation = { file: string; rule: string; detail: string };

const SHARED_DOMAIN_HOOKS = /\/components\/[^/]+\/hooks\//;
const SHARED_DOMAIN_UTILS = /\/components\/[^/]+\/utils\//;

const HOOK_IN_COMPONENTS = /\/components\/(?:[^/]+\/)*use[^/]+\.tsx?$/;
const UTILS_IN_COMPONENTS =
  /\/components\/(?:[^/]+\/)*(?:[^/]*Utils[^/]*|[^/]*helpers[^/]*)\.tsx?$/i;
const HOOK_AT_ROUTE_ROOT = /^app\/\(app\)\/app\/[^/]+(?:\/\[[^\]]+\])?\/use[^/]+\.tsx?$/;

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === ".next") {
        continue;
      }
      walk(full, acc);
      if (entry === "steps" && full.includes(`${join("app", "(app)", "app")}`)) {
        acc.push(full);
      }
    } else if (/\.(tsx?|jsx?)$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

function normalizeRel(rel: string): string {
  return rel.replace(/\\/g, "/");
}

function checkFile(absPath: string): Violation[] {
  if (!STRICT) {
    return [];
  }

  const rel = normalizeRel(relative(WEBAPP_SRC, absPath));
  const violations: Violation[] = [];

  if (HOOK_IN_COMPONENTS.test(rel) && !SHARED_DOMAIN_HOOKS.test(rel)) {
    violations.push({
      detail: "Move use* hooks to hooks/ at the route or shared domain folder",
      file: rel,
      rule: "no-hooks-in-components",
    });
  }

  if (UTILS_IN_COMPONENTS.test(rel) && !SHARED_DOMAIN_UTILS.test(rel)) {
    violations.push({
      detail: "Move *Utils.ts and *helpers.ts files to utils/",
      file: rel,
      rule: "no-utils-in-components",
    });
  }

  if (HOOK_AT_ROUTE_ROOT.test(rel)) {
    violations.push({
      detail: "Move use* files from route root into hooks/",
      file: rel,
      rule: "no-hooks-at-route-root",
    });
  }

  return violations;
}

function checkStepsDirs(absPath: string): Violation[] {
  if (!STRICT) {
    return [];
  }

  const rel = normalizeRel(relative(WEBAPP_SRC, absPath));
  if (!rel.startsWith("app/(app)/app/") || !statSync(absPath).isDirectory()) {
    return [];
  }

  if (rel.endsWith("/steps") || rel.includes("/steps/")) {
    return [
      {
        detail: "Use components/ for wizard steps (e.g. components/StepWelcome.tsx)",
        file: rel,
        rule: "no-steps-folder",
      },
    ];
  }

  return [];
}

function main(): void {
  const files = walk(WEBAPP_SRC);
  const violations = [
    ...files.flatMap((entry) => {
      if (statSync(entry).isDirectory()) {
        return checkStepsDirs(entry);
      }
      return checkFile(entry);
    }),
  ];

  if (violations.length === 0) {
    console.log("check-route-structure: OK");
    return;
  }

  console.error("check-route-structure: violations found\n");
  for (const v of violations) {
    console.error(`  [${v.rule}] ${v.file}\n    ${v.detail}`);
  }
  process.exit(1);
}

main();
