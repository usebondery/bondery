/**
 * Guards theme write patterns: useMantineColorScheme only in ColorSchemeSync.
 * Run via: npm run check-theme-patterns
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEBAPP_SRC = join(__dirname, "..", "src");
const STRICT = process.env.CHECK_THEME_PATTERNS_STRICT === "1";

const ALLOWED_USE_MANTINE_COLOR_SCHEME_FILES = new Set(["components/shell/ColorSchemeSync.tsx"]);

function usesMantineColorSchemeHook(source: string): boolean {
  const withoutLineComments = source.replace(/\/\/.*$/gm, "");
  return (
    /import\s*\{[^}]*\buseMantineColorScheme\b/.test(withoutLineComments) ||
    /\buseMantineColorScheme\s*\(/.test(withoutLineComments)
  );
}

type Violation = { file: string; rule: string; detail: string };

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === ".next") {
        continue;
      }
      walk(full, acc);
    } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
      acc.push(full);
    }
  }
  return acc;
}

function check(): Violation[] {
  const violations: Violation[] = [];

  for (const file of walk(WEBAPP_SRC)) {
    const rel = relative(WEBAPP_SRC, file).replaceAll("\\", "/");
    if (!usesMantineColorSchemeHook(readFileSync(file, "utf8"))) {
      continue;
    }
    if (ALLOWED_USE_MANTINE_COLOR_SCHEME_FILES.has(rel)) {
      continue;
    }
    violations.push({
      detail:
        "useMantineColorScheme must only be used in ColorSchemeSync (session → Mantine one-way)",
      file: rel,
      rule: "theme-use-mantine-color-scheme",
    });
  }

  return violations;
}

const violations = check();

if (violations.length > 0) {
  const header = STRICT
    ? "Theme pattern check failed:"
    : "Theme pattern warnings (set CHECK_THEME_PATTERNS_STRICT=1 to fail):";
  console.error(header);
  for (const v of violations) {
    console.error(`  [${v.rule}] ${v.file}: ${v.detail}`);
  }
  if (STRICT) {
    process.exit(1);
  }
} else {
  console.log("Theme pattern check passed.");
}
