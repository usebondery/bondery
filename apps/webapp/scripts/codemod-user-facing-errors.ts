/**
 * Replace error.message in notification descriptions with getUserFacingError.
 *
 * Usage: npx tsx apps/webapp/scripts/codemod-user-facing-errors.ts
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "src");

function walk(dir: string, files: string[] = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      walk(path, files);
      continue;
    }
    if (entry.endsWith(".tsx") || entry.endsWith(".ts")) {
      files.push(path);
    }
  }
  return files;
}

const importLine = 'import { getUserFacingError } from "@bondery/helpers/api";\n';
const hookLine = "  const tCommon = useCommonTranslations();\n";

for (const file of walk(root)) {
  let content = readFileSync(file, "utf8");
  if (!content.includes("error instanceof Error ? error.message")) {
    continue;
  }

  content = content.replace(
    /error instanceof Error \? error\.message : [^,\n]+/g,
    "getUserFacingError(error, tCommon)",
  );

  if (!content.includes("getUserFacingError")) {
    continue;
  }

  if (!content.includes('from "@bondery/helpers/api"')) {
    const lines = content.split("\n");
    const lastImport = lines.findLastIndex((line) => line.startsWith("import "));
    lines.splice(lastImport + 1, 0, importLine.trim());
    content = lines.join("\n");
  }

  if (!content.includes("useCommonTranslations")) {
    const lines = content.split("\n");
    const hookImport = lines.findIndex((line) =>
      line.includes('from "@/lib/i18n/generated/hooks"'),
    );
    if (hookImport >= 0) {
      lines[hookImport] = lines[hookImport].replace(
        "useCommonTranslations",
        "useCommonTranslations",
      );
      if (!lines[hookImport].includes("useCommonTranslations")) {
        lines.splice(
          hookImport + 1,
          0,
          'import { useCommonTranslations } from "@/lib/i18n/generated/hooks";',
        );
      }
    } else {
      const lastImport = lines.findLastIndex((line) => line.startsWith("import "));
      lines.splice(
        lastImport + 1,
        0,
        'import { useCommonTranslations } from "@/lib/i18n/generated/hooks";',
      );
    }
    content = lines.join("\n");
  }

  if (!content.includes("const tCommon = useCommonTranslations()")) {
    content = content.replace(/(export default function [^{]+\{)/, `$1\n${hookLine}`);
    content = content.replace(/(export function [^{]+\{)/, `$1\n${hookLine}`);
    content = content.replace(/(function [A-Z][A-Za-z]+[^{]*\{)/, `$1\n${hookLine}`);
  }

  writeFileSync(file, content, "utf8");
  console.log(`updated ${file}`);
}

console.log("codemod-user-facing-errors: done");
