/**
 * Supabase environment setup script.
 *
 * Validates the environment file, uploads Edge Function secrets (remote only),
 * and seeds the vault API URL secret.
 *
 * Usage:
 *   npx tsx scripts/setup.ts --env local
 *   npx tsx scripts/setup.ts --env beta
 *   npx tsx scripts/setup.ts --env production
 */

import { existsSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// ── Colors ────────────────────────────────────────────────────────────────────

const c = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
  reset: "\x1b[0m",
};

// ── Env parsing ───────────────────────────────────────────────────────────────

function parseEnvFile(filePath: string): Record<string, string> {
  const content = readFileSync(filePath, "utf-8");
  const env: Record<string, string> = {};
  content.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) return;
    const key = trimmed.slice(0, eqIdx).trim();
    const raw = trimmed.slice(eqIdx + 1).trim();
    if (key) env[key] = raw.replace(/^["']|["']$/g, "");
  });
  return env;
}

function checkEnv(envFile: string, requiredVars: string[]): Record<string, string> {
  const envFilePath = resolve(root, envFile);

  console.log(`\n${c.blue}🔍 Checking ${envFile}...${c.reset}`);

  if (!existsSync(envFilePath)) {
    console.error(`${c.red}❌ Missing env file: ${envFile}${c.reset}`);
    console.error(`   Copy the example and fill in the values:`);
    console.error(`   ${c.yellow}cp .env.local.example ${envFile}${c.reset}\n`);
    process.exit(1);
  }

  const vars = parseEnvFile(envFilePath);
  const missing = requiredVars.filter((v) => !vars[v] || vars[v] === "");

  if (missing.length > 0) {
    console.error(`${c.red}❌ Missing required variables in ${envFile}:${c.reset}\n`);
    missing.forEach((v) => console.error(`   ${c.red}✗${c.reset} ${v}`));
    console.error(`\n${c.yellow}Please set these variables before running setup.${c.reset}\n`);
    process.exit(1);
  }

  console.log(`${c.green}✅ All required variables are set${c.reset}`);
  return vars;
}

// ── Command runner ────────────────────────────────────────────────────────────

function run(cmd: string) {
  console.log(`\n${c.cyan}$ ${cmd}${c.reset}`);
  execSync(cmd, { cwd: root, stdio: "inherit" });
}

// ── Required variables ────────────────────────────────────────────────────────

const COMMON_VARS = [
  "BONDERY_SUPABASE_WEBAPP_URL",
  "BONDERY_SUPABASE_WEBAPP_CALLBACK_URL",
  "BONDERY_SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID",
  "BONDERY_SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET",
  "BONDERY_SUPABASE_AUTH_CALLBACK_URL",
  "BONDERY_SUPABASE_AUTH_EXTERNAL_LINKEDIN_CLIENT_ID",
  "BONDERY_SUPABASE_AUTH_EXTERNAL_LINKEDIN_SECRET",
];

const REMOTE_VARS = [...COMMON_VARS, "SUPABASE_PROJECT_REF"];

const SNIPPET_DIR = `./supabase/snippets/Setup`;

// ── Main ──────────────────────────────────────────────────────────────────────

const envIdx = process.argv.indexOf("--env");
const env = envIdx !== -1 ? process.argv[envIdx + 1] : undefined;

if (env !== "local" && env !== "beta" && env !== "production") {
  console.error(`${c.red}Usage: npx tsx scripts/setup.ts --env local|beta|production${c.reset}`);
  process.exit(1);
}

console.log(`\n${c.bold}${c.blue}⚙️  Bondery Supabase setup — ${env}${c.reset}\n`);

if (env === "local") {
  checkEnv(".env.local", COMMON_VARS);

  console.log(`\n${c.blue}🔐 Seeding vault secret (local)...${c.reset}`);
  runLocalSqlFile(`${SNIPPET_DIR}/set_vault_api_url_local.sql`);
} else {
  const envFile = `.env.${env}`;
  const vars = checkEnv(envFile, REMOTE_VARS);
  const projectRef = vars["SUPABASE_PROJECT_REF"];

  console.log(`\n${c.blue}🔑 Uploading secrets to Supabase (${env})...${c.reset}`);
  run(`npx supabase secrets set --env-file ${envFile} --project-ref ${projectRef}`);

  console.log(`\n${c.blue}🔐 Vault secret note (${env})...${c.reset}`);
  console.log(
    `${c.yellow}   The 'next_public_api_url' vault secret is already seeded by migration.`,
  );
  console.log(`   If you need to override it, open the Supabase dashboard → SQL Editor and run:`);
  console.log(`   ${SNIPPET_DIR}/set_vault_api_url_${env}.sql${c.reset}`);
}

console.log(`\n${c.bold}${c.green}✅ Setup complete for ${env} environment.${c.reset}\n`);
