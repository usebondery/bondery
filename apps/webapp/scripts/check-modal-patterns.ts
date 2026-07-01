/**
 * Guards modal dismiss and hosting patterns in the webapp.
 * Run via: npm run check-modal-patterns
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEBAPP_SRC = join(__dirname, "..", "src");
const STRICT = process.env.CHECK_MODAL_PATTERNS_STRICT === "1";

type Violation = { file: string; rule: string; detail: string };

const ALLOWED_DECLARATIVE_MODAL_FILES = new Set([
  "app/(app)/app/onboarding/OnboardingFlow.tsx",
]);

const ALLOWED_UPDATE_MODAL_FILES = new Set([
  "lib/modals/useModalBlocking.ts",
  "app/(app)/app/people/components/AddPeopleToGroupSelectionModal.tsx",
  "app/(app)/app/settings/components/openApiKeyModal.tsx",
  "app/(app)/app/settings/components/LinkedInImportModal.tsx",
  "app/(app)/app/settings/components/InstagramImportModal.tsx",
  "app/(app)/app/settings/components/VCardImportModal.tsx",
]);

const DISMISS_UPDATE_PATTERN =
  /modals\.updateModal\(\{[\s\S]*?(closeOnEscape|closeOnClickOutside|withCloseButton)/;

const BLOCKING_STATE_PATTERN =
  /\b(isSubmitting|isPending|actionLoading|isParsing|isImporting)\b/;

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

function normalizeRel(rel: string): string {
  return rel.replace(/\\/g, "/");
}

function checkFile(absPath: string): Violation[] {
  if (!STRICT) {
    return [];
  }

  const rel = normalizeRel(relative(WEBAPP_SRC, absPath));
  const content = readFileSync(absPath, "utf8");
  const violations: Violation[] = [];

  if (/<Modal[\s>]/.test(content) && !ALLOWED_DECLARATIVE_MODAL_FILES.has(rel)) {
    violations.push({
      file: rel,
      rule: "no-declarative-modal",
      detail: "Use modals.open via open*Modal helpers; OnboardingFlow is the only <Modal> exception",
    });
  }

  if (DISMISS_UPDATE_PATTERN.test(content) && rel !== "lib/modals/useModalBlocking.ts") {
    violations.push({
      file: rel,
      rule: "no-dismiss-update-modal",
      detail:
        "Use useModalBlocking for dismiss chrome; never set closeOnEscape/closeOnClickOutside/withCloseButton in feature code",
    });
  }

  if (
    content.includes("modals.updateModal") &&
    !ALLOWED_UPDATE_MODAL_FILES.has(rel) &&
    rel !== "lib/modals/useModalBlocking.ts"
  ) {
    violations.push({
      file: rel,
      rule: "no-raw-update-modal",
      detail: "Route modal chrome updates through useModalBlocking or an allowlisted title/size effect",
    });
  }

  if (
    BLOCKING_STATE_PATTERN.test(content) &&
    content.includes("modalId") &&
    /function\s+\w+Modal|function\s+\w+Form|ModalBody/.test(content) &&
    !content.includes("useModalBlocking") &&
    !rel.includes("openStandardConfirmModal")
  ) {
    violations.push({
      file: rel,
      rule: "missing-use-modal-blocking",
      detail: "Modal bodies with async/blocking state must call useModalBlocking(modalId, isBlocking)",
    });
  }

  return violations;
}

function main(): void {
  const files = walk(WEBAPP_SRC);
  const violations = files.flatMap(checkFile);

  if (violations.length === 0) {
    console.log("check-modal-patterns: OK");
    return;
  }

  console.error("check-modal-patterns: violations found\n");
  for (const v of violations) {
    console.error(`  [${v.rule}] ${v.file}\n    ${v.detail}`);
  }
  process.exit(1);
}

main();
