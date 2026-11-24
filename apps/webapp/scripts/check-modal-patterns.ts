/**
 * Guards modal dismiss and hosting patterns in the webapp.
 * Run via: pnpm run check:modal-patterns
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { createCheck } from "../../../scripts/check/check-report.mjs";

const JS_TS_EXTENSION = /\.(tsx?|jsx?)$/;
const USE_A_Z_MODAL = /\buse[A-Z]\w*Modal\(/;
const MODAL = /<Modal[\s>]/;
const FUNCTION_MODAL_FUNCTION_FORM_MODALBODY = /function\s+\w+Modal|function\s+\w+Form|ModalBody/;
const CONTACTSTABLE = /<ContactsTable[\s>]/;

const check = createCheck("check-modal-patterns");

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEBAPP_SRC = join(__dirname, "..", "src");

type Violation = { file: string; rule: string; detail: string };

const ALLOWED_DECLARATIVE_MODAL_FILES = new Set([
  "app/(app)/app/(shell)/onboarding/OnboardingClient.tsx",
  "components/billing/PaymentFailureModal.tsx",
  "components/shared/UpgradeButton.tsx",
]);

const ALLOWED_UPDATE_MODAL_FILES = new Set([
  "lib/modals/useModalBlocking.ts",
  "app/(app)/app/(shell)/people/components/modals/AddPeopleToGroupSelectionModal.tsx",
  "app/(app)/app/(shell)/settings/components/modals/openApiKeyModal.tsx",
  "app/(app)/app/(shell)/settings/components/modals/LinkedInImportModal.tsx",
  "app/(app)/app/(shell)/settings/components/modals/InstagramImportModal.tsx",
  "app/(app)/app/(shell)/settings/components/modals/VCardImportModal.tsx",
  "app/(app)/app/(shell)/settings/components/modals/BonderyImportModal.tsx",
  "components/photo/openPhotoUploadModal.tsx",
]);

const DISMISS_UPDATE_PATTERN =
  /modals\.updateModal\(\{(?:(?!\bmodals\.(?:open|close)\b)[\s\S])*?(closeOnEscape|closeOnClickOutside|withCloseButton)/;

const DISMISS_OPEN_PATTERN =
  /modals\.open\(\{(?:(?!\bmodals\.(?:open|updateModal|close)\b)[\s\S])*?(closeOnEscape|closeOnClickOutside|withCloseButton)/;

const BLOCKING_STATE_PATTERN = /\b(isSubmitting|isPending|actionLoading|isParsing|isImporting)\b/;

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === ".next") {
        continue;
      }
      walk(full, acc);
    } else if (JS_TS_EXTENSION.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

function normalizeRel(rel: string): string {
  return rel.replace(/\\/g, "/");
}

function hasModalBlockingHelper(content: string): boolean {
  if (content.includes("useModalBlocking") || content.includes("useModalDismiss")) {
    return true;
  }
  // Hooks that own dismiss/blocking for their modal body (see useInstagramImportModal).
  return USE_A_Z_MODAL.test(content);
}

function checkFile(absPath: string): Violation[] {
  const rel = normalizeRel(relative(WEBAPP_SRC, absPath));
  const content = readFileSync(absPath, "utf8");
  const violations: Violation[] = [];

  if (MODAL.test(content) && !ALLOWED_DECLARATIVE_MODAL_FILES.has(rel)) {
    violations.push({
      detail:
        "Use modals.open via open*Modal helpers; OnboardingClient is the only <Modal> exception",
      file: rel,
      rule: "no-declarative-modal",
    });
  }

  if (DISMISS_UPDATE_PATTERN.test(content) && rel !== "lib/modals/useModalBlocking.ts") {
    violations.push({
      detail:
        "Use useModalBlocking for dismiss chrome; never set closeOnEscape/closeOnClickOutside/withCloseButton in feature code",
      file: rel,
      rule: "no-dismiss-update-modal",
    });
  }

  if (
    DISMISS_OPEN_PATTERN.test(content) &&
    rel !== "app/(app)/app/(shell)/onboarding/OnboardingClient.tsx"
  ) {
    violations.push({
      detail:
        "Use useModalBlocking for dismiss chrome; never set closeOnEscape/closeOnClickOutside/withCloseButton in modals.open",
      file: rel,
      rule: "no-dismiss-open-modal",
    });
  }

  if (
    content.includes("modals.updateModal") &&
    !ALLOWED_UPDATE_MODAL_FILES.has(rel) &&
    rel !== "lib/modals/useModalBlocking.ts"
  ) {
    violations.push({
      detail:
        "Route modal chrome updates through useModalBlocking or an allowlisted title/size effect",
      file: rel,
      rule: "no-raw-update-modal",
    });
  }

  if (
    BLOCKING_STATE_PATTERN.test(content) &&
    content.includes("modalId") &&
    FUNCTION_MODAL_FUNCTION_FORM_MODALBODY.test(content) &&
    !hasModalBlockingHelper(content) &&
    !rel.includes("openStandardConfirmModal")
  ) {
    violations.push({
      detail:
        "Modal bodies with async/blocking state must call useModalBlocking(modalId, isBlocking)",
      file: rel,
      rule: "missing-use-modal-blocking",
    });
  }

  if (
    CONTACTSTABLE.test(content) &&
    content.includes("ModalFooter") &&
    !content.includes("ModalScrollLayout")
  ) {
    violations.push({
      detail:
        "Modal bodies with ContactsTable must use ModalScrollLayout so footer actions stay visible",
      file: rel,
      rule: "missing-modal-scroll-layout",
    });
  }

  return violations;
}

function main(): void {
  const files = walk(WEBAPP_SRC);
  const violations = files.flatMap(checkFile);

  for (const violation of violations) {
    check.add(`[${violation.rule}] ${violation.file}: ${violation.detail}`);
  }

  check.ok();
}

main();
