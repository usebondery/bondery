/**
 * Guards against tier-1 REST fetch patterns in mobile feature code.
 * Run via: npm run check-sync-patterns --workspace=mobile
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MOBILE_SRC = join(__dirname, "..", "src");
const FEATURES_DIR = join(MOBILE_SRC, "features");

const BANNED_IMPORTS = [
  "fetchContacts",
  "fetchContact",
  "createContact",
  "updateContact",
  "deleteContact",
  "deleteContacts",
  "fetchGroups",
  "fetchGroup",
  "createGroup",
  "updateGroup",
  "deleteGroup",
  "addGroupMembers",
  "removeGroupMembers",
  "fetchTags",
  "createTag",
  "updateTag",
  "deleteTag",
  "replaceImportantDates",
  "fetchImportantDates",
];

const BANNED_PATTERNS = [
  { rule: "no-is-sync-ready-branch", re: /\bisSyncReady\b/ },
  { rule: "no-fetch-contacts-page-rest", re: /from\s+["'][^"']*lib\/api\/client["'][^;]*fetchContacts/ },
  { rule: "no-entity-zustand-stores", re: /use(Contacts|Groups|Tags)Store/ },
  { rule: "no-lib-store-import", re: /from\s+["'][^"']*lib\/store["']/ },
];

type Violation = { file: string; rule: string; detail: string };

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules") continue;
      walk(full, acc);
    } else if (/\.(tsx?|jsx?)$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

function isAllowedFile(rel: string): boolean {
  const normalized = rel.replace(/\\/g, "/");
  return (
    normalized.startsWith("lib/api/") ||
    normalized.startsWith("lib/domains/") ||
    normalized.startsWith("lib/sync/")
  );
}

function checkFile(absPath: string): Violation[] {
  const rel = relative(MOBILE_SRC, absPath);
  const normalized = rel.replace(/\\/g, "/");
  const content = readFileSync(absPath, "utf8");
  const violations: Violation[] = [];

  if (normalized.startsWith("lib/sync/")) {
    for (const { rule, re } of BANNED_PATTERNS) {
      if (rule === "no-is-sync-ready-branch" || rule === "no-fetch-contacts-page-rest") continue;
      if (re.test(content)) {
        violations.push({ file: rel, rule, detail: `Banned pattern ${rule}` });
      }
    }
    return violations;
  }

  if (!rel.startsWith("features")) {
    return [];
  }
  if (isAllowedFile(rel)) {
    return violations;
  }

  for (const name of BANNED_IMPORTS) {
    const importRe = new RegExp(
      `import\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*["'][^"']*lib/api/client["']`,
    );
    if (importRe.test(content)) {
      violations.push({
        file: rel,
        rule: "no-tier1-rest-import",
        detail: `Feature imports banned tier-1 API helper: ${name}`,
      });
    }
  }

  for (const { rule, re } of BANNED_PATTERNS) {
    if (re.test(content)) {
      violations.push({
        file: rel,
        rule,
        detail: `Banned pattern ${rule}`,
      });
    }
  }

  return violations;
}

function main(): void {
  const files = [...walk(FEATURES_DIR), ...walk(join(MOBILE_SRC, "lib", "sync"))];
  const violations = files.flatMap(checkFile);

  if (violations.length === 0) {
    console.log("check-mobile-sync-patterns: OK");
    return;
  }

  console.error("check-mobile-sync-patterns: FAILED\n");
  for (const v of violations) {
    console.error(`  ${v.file}: [${v.rule}] ${v.detail}`);
  }
  process.exit(1);
}

main();
