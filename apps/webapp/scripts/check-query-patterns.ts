/**
 * Guards against banned TanStack Query migration regressions.
 * Run via: npm run check-query-patterns
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEBAPP_SRC = join(__dirname, "..", "src");
const STRICT = process.env.CHECK_QUERY_PATTERNS_STRICT === "1";

type Violation = { file: string; rule: string; detail: string };

const ALLOWED_REFRESH_FILES = new Set([
  "app/(app)/app/settings/components/LanguagePicker.tsx",
  "app/(app)/app/settings/components/ThemePicker.tsx",
  "hooks/useEmbeddedCheckout.ts",
]);

const ALLOWED_CLIENT_API_PREFIXES = [
  "hooks/useEmbeddedCheckout.ts",
  "lib/photoUpload.tsx",
  "lib/extension/",
  "lib/geocode.ts",
  "lib/query/fetchers/",
  "lib/api/",
];

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue;
      walk(full, acc);
    } else if (/\.(tsx?|jsx?)$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

function isClientFile(content: string): boolean {
  return /^["']use client["'];?\s*$/m.test(content);
}

function normalizeRel(rel: string): string {
  return rel.replace(/\\/g, "/");
}

function isAllowedClientApiPath(rel: string): boolean {
  return ALLOWED_CLIENT_API_PREFIXES.some(
    (prefix) => rel === prefix || rel.startsWith(prefix),
  );
}

function checkFile(absPath: string): Violation[] {
  const rel = normalizeRel(relative(WEBAPP_SRC, absPath));
  const content = readFileSync(absPath, "utf8");
  const violations: Violation[] = [];

  if (isAllowedClientApiPath(rel)) {
    return violations;
  }

  if (STRICT && isClientFile(content) && /\brouter\.refresh\s*\(\s*\)/.test(content)) {
    if (!ALLOWED_REFRESH_FILES.has(rel)) {
      violations.push({
        file: rel,
        rule: "no-router-refresh",
        detail: "Use invalidateQueries instead of router.refresh() for data updates",
      });
    }
  }

  if (STRICT && /from\s+["']@\/app\/\(app\)\/app\/actions["']/.test(content)) {
    violations.push({
      file: rel,
      rule: "no-revalidate-actions",
      detail: "Use query invalidation instead of revalidate* server actions",
    });
  }

  if (STRICT && rel.includes("/chat/") && /const\s+\w+Cache\s*=\s*new\s+Map/.test(content)) {
    violations.push({
      file: rel,
      rule: "no-module-entity-cache",
      detail: "Use useQuery instead of module-level entity Map caches in chat",
    });
  }

  if (
    STRICT &&
    isClientFile(content) &&
    rel.startsWith("app/(app)/app/") &&
    /from\s+["']@\/lib\/api\/client["']/.test(content)
  ) {
    violations.push({
      file: rel,
      rule: "no-api-client-in-app",
      detail: "App components must use lib/query/hooks — not @/lib/api/client",
    });
  }

  if (
    STRICT &&
    rel.startsWith("lib/query/hooks/") &&
    (/from\s+["']@\/lib\/api\/client["']/.test(content) ||
      /\bclientApiJson\b/.test(content) ||
      /\bclientApiFetch\b/.test(content))
  ) {
    violations.push({
      file: rel,
      rule: "no-transport-in-hooks",
      detail: "Query hooks must call lib/api/domains, not clientApiJson/clientApiFetch",
    });
  }

  if (
    STRICT &&
    isClientFile(content) &&
    rel.startsWith("app/(app)/app/") &&
    /from\s+["']@\/lib\/api\/domains\//.test(content) &&
    /from\s+["']@\/lib\/query\/invalidation["']/.test(content)
  ) {
    violations.push({
      file: rel,
      rule: "no-manual-invalidation-in-app",
      detail: "Use lib/query/hooks mutations for invalidation — not domains + invalidation in components",
    });
  }

  if (
    STRICT &&
    isClientFile(content) &&
    rel.startsWith("app/(app)/app/") &&
    /from\s+["']@\/lib\/api\/domains\//.test(content) &&
    !/downloadContactVcard|clientApiFetch/.test(content)
  ) {
    const hasMutationPattern =
      /\b(create|update|delete|add|remove|merge|parse|commit|refresh|accept|restore|decline)\w*\(/.test(
        content,
      ) && /from\s+["']@\/lib\/api\/domains\//.test(content);
    if (hasMutationPattern && !/from\s+["']@\/lib\/query\/hooks\//.test(content)) {
      violations.push({
        file: rel,
        rule: "no-domain-mutations-in-app",
        detail: "App components must use lib/query/hooks for mutations, not lib/api/domains directly",
      });
    }
  }

  return violations;
}

function main(): void {
  const files = walk(WEBAPP_SRC);
  const violations = files.flatMap(checkFile);

  if (violations.length === 0) {
    console.log("check-query-patterns: OK");
    return;
  }

  console.error("check-query-patterns: violations found\n");
  for (const v of violations) {
    console.error(`  [${v.rule}] ${v.file}\n    ${v.detail}`);
  }
  process.exit(1);
}

main();
