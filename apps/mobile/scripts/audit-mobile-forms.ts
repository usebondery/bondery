// @ts-nocheck
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const MOBILE_ROOT = resolve(import.meta.dirname, "..");

const SUBMIT_FORM_FILES = [
  "src/features/contacts/components/CreateContactSheet.tsx",
  "src/features/contacts/components/EditIdentitySheet.tsx",
  "src/features/contacts/components/EditEmailSheet.tsx",
  "src/features/contacts/components/EditPhoneSheet.tsx",
  "src/features/contacts/components/EditSocialSheet.tsx",
  "src/features/contacts/components/GroupEditSheet.tsx",
  "src/features/contacts/components/TagEditSheet.tsx",
  "src/features/contacts/components/EditImportantDateSheet.tsx",
  "src/features/contacts/components/EditAddressSheet.tsx",
  "src/features/contacts/ShareContactEmailSheet.tsx",
  "src/features/contacts/ContactNotesEditor.tsx",
] as const;

const SCHEMA_IMPORT_PATTERN = /from\s+"@bondery\/schemas"/;
const FORBIDDEN_PATTERNS = [
  "unknown as z.ZodType",
  "zodResolver(schema as any)",
  "EMAIL_REGEX",
] as const;

let hasErrors = false;

for (const relativePath of SUBMIT_FORM_FILES) {
  const absolutePath = resolve(MOBILE_ROOT, relativePath);
  const content = readFileSync(absolutePath, "utf8");

  if (!SCHEMA_IMPORT_PATTERN.test(content)) {
    hasErrors = true;
    console.error(`[forms-audit] Missing @bondery/schemas import in ${relativePath}`);
  }

  for (const forbidden of FORBIDDEN_PATTERNS) {
    if (content.includes(forbidden)) {
      hasErrors = true;
      console.error(`[forms-audit] Forbidden pattern "${forbidden}" in ${relativePath}`);
    }
  }
}

if (hasErrors) {
  process.exitCode = 1;
  console.error("[forms-audit] Mobile form audit failed.");
} else {
  console.log("[forms-audit] Mobile form audit passed.");
}
