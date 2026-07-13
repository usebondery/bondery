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
  { re: /\bisSyncReady\b/, rule: "no-is-sync-ready-branch" },
  {
    re: /from\s+["'][^"']*lib\/api\/client["'][^;]*fetchContacts/,
    rule: "no-fetch-contacts-page-rest",
  },
  { re: /use(Contacts|Groups|Tags)Store/, rule: "no-entity-zustand-stores" },
  { re: /from\s+["'][^"']*lib\/store["']/, rule: "no-lib-store-import" },
];

const DOMAIN_READ_EXPORTS = [
  "listContacts",
  "getContact",
  "getMyselfContact",
  "getMyselfContactId",
  "getContactTags",
  "getContactGroups",
  "getContactImportantDates",
  "listGroups",
  "getGroup",
  "listGroupMembers",
  "listTags",
  "getTag",
];

type Violation = { file: string; rule: string; detail: string; severity: "error" | "warn" };

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules") {
        continue;
      }
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

function checkDomainReadImports(rel: string, content: string): Violation[] {
  const domainImportRe =
    /import\s*\{([^}]+)\}\s*from\s*["'][^"']*lib\/domains\/(?:contacts|groups|tags)["']/g;
  const violations: Violation[] = [];

  for (const match of content.matchAll(domainImportRe)) {
    const imported = match[1] ?? "";
    for (const name of DOMAIN_READ_EXPORTS) {
      const nameRe = new RegExp(`\\b${name}\\b`);
      if (nameRe.test(imported)) {
        violations.push({
          detail: `Feature imports tier-1 read ${name} from lib/domains — use lib/sync/hooks instead`,
          file: rel,
          rule: "no-feature-domain-read-import",
          severity: "warn",
        });
      }
    }
  }

  return violations;
}

function checkFile(absPath: string): Violation[] {
  const rel = relative(MOBILE_SRC, absPath);
  const normalized = rel.replace(/\\/g, "/");
  const content = readFileSync(absPath, "utf8");
  const violations: Violation[] = [];

  if (normalized.startsWith("lib/sync/repositories/")) {
    return violations;
  }

  if (normalized.startsWith("lib/sync/")) {
    for (const { rule, re } of BANNED_PATTERNS) {
      if (rule === "no-is-sync-ready-branch" || rule === "no-fetch-contacts-page-rest") {
        continue;
      }
      if (re.test(content)) {
        violations.push({ detail: `Banned pattern ${rule}`, file: rel, rule, severity: "error" });
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

  if (/from\s+["'][^"']*lib\/sync\/repositories\//.test(content)) {
    violations.push({
      detail: "Features must not import lib/sync/repositories — use lib/domains or lib/sync/hooks",
      file: rel,
      rule: "no-feature-repository-import",
      severity: "error",
    });
  }

  violations.push(...checkDomainReadImports(rel, content));

  for (const name of BANNED_IMPORTS) {
    const importRe = new RegExp(
      `import\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*["'][^"']*lib/api/client["']`,
    );
    if (importRe.test(content)) {
      violations.push({
        detail: `Feature imports banned tier-1 API helper: ${name}`,
        file: rel,
        rule: "no-tier1-rest-import",
        severity: "error",
      });
    }
  }

  for (const { rule, re } of BANNED_PATTERNS) {
    if (re.test(content)) {
      violations.push({
        detail: `Banned pattern ${rule}`,
        file: rel,
        rule,
        severity: "error",
      });
    }
  }

  return violations;
}

function main(): void {
  const files = [...walk(FEATURES_DIR), ...walk(join(MOBILE_SRC, "lib", "sync"))];
  const violations = files.flatMap(checkFile);
  const errors = violations.filter((v) => v.severity === "error");
  const warnings = violations.filter((v) => v.severity === "warn");

  if (violations.length === 0) {
    console.log("check-mobile-sync-patterns: OK");
    return;
  }

  if (warnings.length > 0) {
    console.warn("check-mobile-sync-patterns: warnings\n");
    for (const v of warnings) {
      console.warn(`  ${v.file}: [${v.rule}] ${v.detail}`);
    }
    console.warn("");
  }

  if (errors.length > 0) {
    console.error("check-mobile-sync-patterns: FAILED\n");
    for (const v of errors) {
      console.error(`  ${v.file}: [${v.rule}] ${v.detail}`);
    }
    process.exit(1);
  }

  console.log("check-mobile-sync-patterns: OK (with warnings)");
}

main();
