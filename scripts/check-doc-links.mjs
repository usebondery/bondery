// Validates doc link registry, local files, anchors, and in-app usage.
import { execSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const DOCS_DIR = join(REPO_ROOT, "docs");
const GENERATED_FILE = join(REPO_ROOT, "packages/helpers/src/docs/doc-links.generated.ts");

const SCAN_DIRS = [
  join(REPO_ROOT, "apps/webapp/src"),
  join(REPO_ROOT, "packages/mantine-next/src"),
];

const BANNED_PATTERNS = [
  { label: "$" + "{HELP_DOCS_URL}/…", pattern: /\$\{HELP_DOCS_URL\}\// },
  { label: "$" + "{WEBSITE_URL}/docs/…", pattern: /\$\{WEBSITE_URL\}\/docs\// },
  { label: '"/docs/concepts/…"', pattern: /\/docs\/concepts\// },
];

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === ".next") {
        continue;
      }
      walk(full, acc);
    } else if (/\.(tsx?|jsx?)$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

function loadRegistry() {
  const source = readFileSync(GENERATED_FILE, "utf8");
  const entries = new Map();
  const lineRe = /^\s+"([^"]+)":\s*\{\s*path:\s*"([^"]*)"(?:,\s*hash:\s*"([^"]*)")?\s*\},?\s*$/gm;
  let match = lineRe.exec(source);
  while (match !== null) {
    entries.set(match[1], { hash: match[3], path: match[2] });
    match = lineRe.exec(source);
  }
  if (entries.size === 0) {
    throw new Error(`Could not parse DOC_LINKS from ${GENERATED_FILE}`);
  }
  return entries;
}

function resolveDocFile(docPath) {
  if (!docPath) {
    return join(DOCS_DIR, "README.md");
  }
  return join(DOCS_DIR, `${docPath}.md`);
}

function main() {
  const errors = [];

  execSync("node scripts/generate-doc-links.mjs", { cwd: REPO_ROOT, stdio: "inherit" });

  const registry = loadRegistry();
  const knownIds = new Set(registry.keys());

  for (const [id, entry] of registry) {
    const filePath = resolveDocFile(entry.path);
    try {
      const content = readFileSync(filePath, "utf8");
      if (entry.hash && !content.includes(`{#${entry.hash}}`)) {
        errors.push(
          `Missing anchor {#${entry.hash}} in ${relative(REPO_ROOT, filePath)} (docId: ${id})`,
        );
      }
    } catch {
      errors.push(`Missing doc file ${relative(REPO_ROOT, filePath)} (docId: ${id})`);
    }
  }

  const usedIds = new Set();
  const sourceFiles = SCAN_DIRS.flatMap((dir) => walk(dir));

  for (const filePath of sourceFiles) {
    const rel = relative(REPO_ROOT, filePath);
    const content = readFileSync(filePath, "utf8");

    for (const { pattern, label } of BANNED_PATTERNS) {
      if (pattern.test(content)) {
        errors.push(`Banned hardcoded doc URL (${label}) in ${rel}`);
      }
    }

    for (const match of content.matchAll(/\bdoc="([^"]+)"/g)) {
      usedIds.add(match[1]);
    }
    for (const match of content.matchAll(/\bhelpDoc="([^"]+)"/g)) {
      usedIds.add(match[1]);
    }
    for (const match of content.matchAll(/\bhelpDoc=\{([^}]+)\}/g)) {
      const expr = match[1];
      for (const idMatch of expr.matchAll(/"([^"]+)"/g)) {
        if (idMatch[1].includes(".")) {
          usedIds.add(idMatch[1]);
        }
      }
    }
    for (const match of content.matchAll(/\bdocHref\(\s*"([^"]+)"\s*\)/g)) {
      usedIds.add(match[1]);
    }
  }

  for (const id of usedIds) {
    if (!knownIds.has(id)) {
      errors.push(`Unknown docId referenced in app code: ${id}`);
    }
  }

  if (errors.length > 0) {
    console.error("\nDoc link validation failed:\n");
    for (const error of errors) {
      console.error(`  - ${error}`);
    }
    process.exit(1);
  }

  console.log(
    `Doc links OK: ${registry.size} registry entries, ${usedIds.size} referenced docId(s) in app code.`,
  );
}

main();
