// Fails CI when legacy local dev ports appear in tracked config/docs.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");

/** Legacy Bondery dev ports replaced by the 2663x Dial BOND block. */
const FORBIDDEN_PATTERNS = [
  { label: "localhost:3000", pattern: /localhost:3000\b/g },
  { label: "localhost:3001", pattern: /localhost:3001\b/g },
  { label: "localhost:3002", pattern: /localhost:3002\b/g },
  { label: "localhost:3003", pattern: /localhost:3003\b/g },
  { label: "localhost:3004", pattern: /localhost:3004\b/g },
  { label: "127.0.0.1:3001", pattern: /127\.0\.0\.1:3001\b/g },
  { label: "--port 300x", pattern: /--port\s+300[0-4]\b/g },
  { label: "--port 8081", pattern: /--port\s+8081\b/g },
  { label: "port: 300x", pattern: /\bport:\s*300[0-4]\b/g },
  { label: "localtunnel --port 3001", pattern: /localtunnel\s+--port\s+3001\b/g },
  {
    label: "BONDERY_PUBLIC_EXTRA_ALLOWED_ORIGINS localhost:8081",
    pattern: /BONDERY_PUBLIC_EXTRA_ALLOWED_ORIGINS=.*localhost:8081/g,
  },
  {
    label: 'BONDERY_PUBLIC_EXTRA_ALLOWED_ORIGINS "http://localhost:8081"',
    pattern: /BONDERY_PUBLIC_EXTRA_ALLOWED_ORIGINS="http:\/\/localhost:8081"/g,
  },
];

const SCAN_FILES = [
  "apps/website/package.json",
  "apps/webapp/package.json",
  "apps/mobile/package.json",
  "packages/emails/package.json",
  "package.json",
  "apps/chrome-extension/wxt.config.ts",
  "apps/api/.env.development.example",
  "apps/webapp/.env.development.example",
  "apps/website/.env.development.local.example",
  "apps/chrome-extension/.env.development.example",
  "apps/mobile/.env.example",
  "apps/supabase-db/.env.local.example",
  "apps/api/openapi.yaml",
  "apps/api/src/openapi/swagger-config.ts",
  "apps/api/scripts/generate-openapi.ts",
  "apps/api/src/test/load-test-env.ts",
  "docs/contributing/architecture.md",
  "docs/contributing/local-setup.md",
  "apps/website/README.md",
  "apps/supabase-db/README.md",
  ".agents/workflows/CHROME-EXTENSION-OAUTH.md",
  ".agents/skills/native-data-fetching/SKILL.md",
];

const ALLOWLIST = new Set(["scripts/check-dev-ports.mjs"]);

function _walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === ".next" || entry === "dist") {
        continue;
      }
      _walk(full, acc);
    } else {
      acc.push(full);
    }
  }
  return acc;
}

function scanFile(filePath, errors) {
  const rel = relative(REPO_ROOT, filePath).replaceAll("\\", "/");
  if (ALLOWLIST.has(rel)) {
    return;
  }

  let content;
  try {
    content = readFileSync(filePath, "utf8");
  } catch {
    return;
  }

  for (const { pattern, label } of FORBIDDEN_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(content)) {
      errors.push(`${rel}: forbidden legacy port reference (${label})`);
    }
  }
}

function main() {
  const errors = [];

  for (const rel of SCAN_FILES) {
    scanFile(join(REPO_ROOT, rel), errors);
  }

  // Also scan .vscode tasks if present (ngrok port forwards)
  const vscodeTasks = join(REPO_ROOT, ".vscode/tasks.json");
  try {
    scanFile(vscodeTasks, errors);
  } catch {
    // optional
  }

  if (errors.length > 0) {
    console.error("Legacy dev port references found:\n");
    for (const error of errors) {
      console.error(`  - ${error}`);
    }
    console.error("\nUse the Dial BOND ports (2663x). See docs/contributing/architecture.md");
    process.exit(1);
  }

  console.log("check-dev-ports: OK");
}

main();
