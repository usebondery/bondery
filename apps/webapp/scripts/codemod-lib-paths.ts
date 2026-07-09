/**
 * One-off import path updates after webapp lib reorganization.
 * Usage: npx tsx scripts/codemod-lib-paths.ts
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const webappRoot = join(__dirname, "..");

const REPLACEMENTS: [string, string][] = [
  ["@/lib/config", "@/lib/platform/config"],
  ["@/lib/activityTypes", "@/lib/contacts/activityTypes"],
  ["@/lib/avatarColor", "@/lib/contacts/avatarColor"],
  ["@/lib/avatarParams", "@/lib/contacts/avatarParams"],
  ["@/lib/nameHelpers", "@/lib/contacts/nameHelpers"],
  ["@/lib/searchContacts", "@/lib/contacts/searchContacts"],
  ["@/lib/socialActionTooltips", "@/lib/contacts/socialActionTooltips"],
  ["@/lib/formatRelativeTime", "@/lib/i18n/formatRelativeTime"],
  ["@/lib/geocode", "@/lib/api/geocode"],
  ["@/lib/imageValidation", "@/lib/shared/imageValidation"],
  ["@/lib/statusNotificationsStore", "@/lib/extension/statusNotificationsStore"],
  ["@/lib/extension/EnrichResumeDetector", "@/components/extension/EnrichResumeDetector"],
  [
    "@/lib/extension/EnrichResumeNotificationContent",
    "@/components/extension/EnrichResumeNotificationContent",
  ],
  [
    "@/lib/extension/EnrichStatusNotificationManager",
    "@/components/extension/EnrichStatusNotificationManager",
  ],
  [
    "@/lib/extension/EnrichStatusNotificationContent",
    "@/components/extension/EnrichStatusNotificationContent",
  ],
  [
    "@/lib/extension/ExtensionUpdateNotificationManager",
    "@/components/extension/ExtensionUpdateNotificationManager",
  ],
  [
    "@/lib/extension/useBatchEnrichFromLinkedIn",
    "@/components/extension/useBatchEnrichFromLinkedIn",
  ],
];

function walk(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === ".next") {
        continue;
      }
      files.push(...walk(full));
    } else if (/\.(ts|tsx|md)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

let updated = 0;

for (const file of walk(webappRoot)) {
  if (file.endsWith("codemod-lib-paths.ts")) {
    continue;
  }

  let content = readFileSync(file, "utf8");
  const original = content;

  for (const [from, to] of REPLACEMENTS) {
    content = content.split(from).join(to);
  }

  if (content !== original) {
    writeFileSync(file, content, "utf8");
    updated++;
    console.log(relative(webappRoot, file));
  }
}

console.log(`\nUpdated ${updated} files.`);
