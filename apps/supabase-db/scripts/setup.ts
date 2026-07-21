/**
 * Supabase environment setup + stack bootstrap.
 *
 * Usage:
 *   npx tsx scripts/setup.ts --env local|beta|production
 *   npx tsx scripts/setup.ts --bootstrap greenfield
 *   npx tsx scripts/setup.ts --bootstrap import
 *
 * Greenfield: empty Postgres — apply migrations, seed vault, ensure buckets.
 * Import: cloud → self-host — vault reconcile only (restore dump separately).
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const repoRoot = resolve(root, "../..");
const deployBondery = resolve(repoRoot, "deploy/bondery");

const c = {
  blue: "\x1b[34m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  reset: "\x1b[0m",
  yellow: "\x1b[33m",
};

function parseEnvFile(filePath: string): Record<string, string> {
  const content = readFileSync(filePath, "utf-8");
  const env: Record<string, string> = {};
  content.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) {
      return;
    }
    const key = trimmed.slice(0, eqIdx).trim();
    const raw = trimmed.slice(eqIdx + 1).trim();
    if (key) {
      env[key] = raw.replace(/^["']|["']$/g, "");
    }
  });
  return env;
}

function checkEnv(envFile: string, requiredVars: string[]): Record<string, string> {
  const envFilePath = resolve(root, envFile);

  console.log(`\n${c.blue}Checking ${envFile}...${c.reset}`);

  if (!existsSync(envFilePath)) {
    console.error(`${c.red}Missing env file: ${envFile}${c.reset}`);
    console.error(`   Copy the example and fill in the values:`);
    console.error(`   ${c.yellow}cp .env.local.example ${envFile}${c.reset}\n`);
    process.exit(1);
  }

  const vars = parseEnvFile(envFilePath);
  const missing = requiredVars.filter((v) => !vars[v] || vars[v] === "");

  if (missing.length > 0) {
    console.error(`${c.red}Missing required variables in ${envFile}:${c.reset}\n`);
    for (const v of missing) {
      console.error(`   ${c.red}x${c.reset} ${v}`);
    }
    console.error(`\n${c.yellow}Please set these variables before running setup.${c.reset}\n`);
    process.exit(1);
  }

  console.log(`${c.green}All required variables are set${c.reset}`);
  return vars;
}

function loadDeployEnv(): Record<string, string> {
  const envPath = resolve(deployBondery, ".env");
  if (!existsSync(envPath)) {
    console.error(`${c.red}Missing deploy/bondery/.env${c.reset}`);
    console.error(`   ${c.yellow}cp deploy/bondery/.env.example deploy/bondery/.env${c.reset}\n`);
    process.exit(1);
  }
  return parseEnvFile(envPath);
}

function requireDeployVars(vars: Record<string, string>, keys: string[]) {
  const missing = keys.filter((k) => !vars[k] || vars[k] === "");
  if (missing.length > 0) {
    console.error(`${c.red}Missing required variables in deploy/bondery/.env:${c.reset}\n`);
    for (const v of missing) {
      console.error(`   ${c.red}x${c.reset} ${v}`);
    }
    process.exit(1);
  }
}

function run(cmd: string, cwd = root) {
  console.log(`\n${c.cyan}$ ${cmd}${c.reset}`);
  execSync(cmd, { cwd, env: process.env, stdio: "inherit" });
}

function runSql(sql: string, vars: Record<string, string>) {
  const password = vars.BONDERY_PRIVATE_POSTGRES_PASSWORD;
  execSync(`docker compose exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1`, {
    cwd: deployBondery,
    env: { ...process.env, PGPASSWORD: password },
    input: sql,
    stdio: ["pipe", "inherit", "inherit"],
  });
}

function upsertVaultSecret(name: string, value: string, vars: Record<string, string>) {
  const sql = `
DO $$
DECLARE
  existing_id uuid;
BEGIN
  SELECT id INTO existing_id FROM vault.secrets WHERE name = '${name}' LIMIT 1;
  IF existing_id IS NULL THEN
    PERFORM vault.create_secret('${value.replace(/'/g, "''")}', '${name}');
  ELSE
    PERFORM vault.update_secret(existing_id, '${value.replace(/'/g, "''")}');
  END IF;
END $$;
`;
  runSql(sql, vars);
}

function reconcileVault(vars: Record<string, string>) {
  const apiUrl = `https://${vars.BONDERY_INFRA_API_DOMAIN}`;
  const serviceKey = vars.BONDERY_PRIVATE_SUPABASE_SECRET_KEY;
  console.log(`\n${c.blue}Seeding vault secrets (API URL + service role key)...${c.reset}`);
  upsertVaultSecret("next_public_api_url", apiUrl, vars);
  upsertVaultSecret("service_role_key", serviceKey, vars);
  upsertVaultSecret("private_bondery_supabase_http_key", serviceKey, vars);
  console.log(`${c.green}Vault secrets upserted for ${apiUrl}${c.reset}`);
}

function ensureStorageBuckets(vars: Record<string, string>) {
  console.log(`\n${c.blue}Ensuring storage buckets (avatars, linkedin_logos)...${c.reset}`);
  // Buckets are created by Bondery migrations when applied; for import path they come with dump.
  // Idempotent insert for greenfield if migrations already ran.
  runSql(
    `
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public)
VALUES ('linkedin_logos', 'linkedin_logos', true)
ON CONFLICT (id) DO NOTHING;
`,
    vars,
  );
}

function bootstrapGreenfield() {
  console.log(`\n${c.bold}${c.blue}Bondery stack bootstrap — greenfield${c.reset}\n`);
  const vars = loadDeployEnv();
  requireDeployVars(vars, [
    "BONDERY_INFRA_API_DOMAIN",
    "BONDERY_INFRA_SUPABASE_DOMAIN",
    "BONDERY_PRIVATE_POSTGRES_PASSWORD",
    "BONDERY_PRIVATE_SUPABASE_SECRET_KEY",
    "BONDERY_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  ]);

  const dbUrl = `postgresql://postgres:${encodeURIComponent(vars.BONDERY_PRIVATE_POSTGRES_PASSWORD)}@127.0.0.1:54322/postgres`;
  console.log(
    `\n${c.yellow}Note: greenfield migrations use \`supabase db push\` against compose Postgres.${c.reset}`,
  );
  console.log(
    `${c.yellow}Expose db temporarily if needed: docker compose exec is used for vault; for push, set DATABASE_URL.${c.reset}`,
  );

  // Prefer pushing via docker network by publishing is not available — use
  // `supabase db push --db-url` through a one-off connection via docker compose run.
  // Practically: copy migrations into a psql apply via supabase CLI with --db-url through
  // host port if override maps 54322, otherwise use `docker compose exec`.
  const overridePath = resolve(deployBondery, "docker-compose.override.yml");
  if (!existsSync(overridePath)) {
    console.log(
      `${c.yellow}Tip: for CLI db push from the host, add ports "54322:5432" on db in docker-compose.override.yml${c.reset}`,
    );
  }

  try {
    run(`npx supabase db push --db-url "${dbUrl}" --yes`, root);
  } catch {
    console.log(
      `\n${c.yellow}Host db push failed (db may not be published). Applying migrations via docker exec...${c.reset}`,
    );
    // Fallback: pipe each migration is heavy; instruct operator.
    console.error(
      `${c.red}Could not reach Postgres on 127.0.0.1:54322.${c.reset}\n` +
        `Add to docker-compose.override.yml:\n` +
        `  services:\n    db:\n      ports:\n        - "54322:5432"\n` +
        `Then: docker compose up -d db && npm run stack:bootstrap:greenfield -w supabase-db\n`,
    );
    process.exit(1);
  }

  reconcileVault(vars);
  ensureStorageBuckets(vars);
  console.log(`\n${c.bold}${c.green}Greenfield bootstrap complete.${c.reset}\n`);
  console.log(`Verify: curl -sf https://${vars.BONDERY_INFRA_API_DOMAIN}/health\n`);
}

function bootstrapImport() {
  console.log(`\n${c.bold}${c.blue}Bondery stack bootstrap — import (post-restore)${c.reset}\n`);
  const vars = loadDeployEnv();
  requireDeployVars(vars, [
    "BONDERY_INFRA_API_DOMAIN",
    "BONDERY_INFRA_SUPABASE_DOMAIN",
    "BONDERY_PRIVATE_POSTGRES_PASSWORD",
    "BONDERY_PRIVATE_SUPABASE_SECRET_KEY",
  ]);

  console.log(
    `${c.yellow}Expected: pg_dump already restored into db; storage files already synced.${c.reset}`,
  );
  console.log(`${c.yellow}This path does NOT run migrations.${c.reset}`);

  reconcileVault(vars);

  console.log(`\n${c.bold}${c.green}Import bootstrap complete (vault reconciled).${c.reset}\n`);
  console.log("Health gate:");
  console.log(`  curl -sf https://${vars.BONDERY_INFRA_API_DOMAIN}/health`);
  console.log(`  curl -sf https://${vars.BONDERY_INFRA_WEBAPP_DOMAIN}/api/ready`);
  console.log("  Manual: OAuth login, API key, avatar upload, reminder cron\n");
}

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

function runLocalSqlFile(relativePath: string) {
  run(`npx supabase db query --file ${relativePath}`);
}

const bootstrapIdx = process.argv.indexOf("--bootstrap");
const bootstrapMode = bootstrapIdx !== -1 ? process.argv[bootstrapIdx + 1] : undefined;

if (bootstrapMode === "greenfield") {
  bootstrapGreenfield();
  process.exit(0);
}
if (bootstrapMode === "import") {
  bootstrapImport();
  process.exit(0);
}

const envIdx = process.argv.indexOf("--env");
const env = envIdx !== -1 ? process.argv[envIdx + 1] : undefined;

if (env !== "local" && env !== "beta" && env !== "production") {
  console.error(
    `${c.red}Usage:${c.reset}\n` +
      `  npx tsx scripts/setup.ts --env local|beta|production\n` +
      `  npx tsx scripts/setup.ts --bootstrap greenfield\n` +
      `  npx tsx scripts/setup.ts --bootstrap import\n`,
  );
  process.exit(1);
}

console.log(`\n${c.bold}${c.blue}Bondery Supabase setup — ${env}${c.reset}\n`);

if (env === "local") {
  checkEnv(".env.local", COMMON_VARS);

  console.log(`\n${c.blue}Seeding vault secret (local)...${c.reset}`);
  runLocalSqlFile(`${SNIPPET_DIR}/set_vault_api_url_local.sql`);
} else {
  const envFile = `.env.${env}`;
  const vars = checkEnv(envFile, REMOTE_VARS);
  const projectRef = vars.SUPABASE_PROJECT_REF;

  console.log(`\n${c.blue}Uploading secrets to Supabase (${env})...${c.reset}`);
  run(`npx supabase secrets set --env-file ${envFile} --project-ref ${projectRef}`);

  console.log(`\n${c.blue}Vault secret note (${env})...${c.reset}`);
  console.log(
    `${c.yellow}   The 'next_public_api_url' vault secret is already seeded by migration.`,
  );
  console.log(`   If you need to override it, open the Supabase dashboard → SQL Editor and run:`);
  console.log(`   ${SNIPPET_DIR}/set_vault_api_url_${env}.sql${c.reset}`);
}

console.log(`\n${c.bold}${c.green}Setup complete for ${env} environment.${c.reset}\n`);
