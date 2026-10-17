import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { applySqlFunctions } from "./apply-sql-functions.js";
import { backfillDefaultPhoneCountry } from "./backfills/default-phone-country.js";
import { prisma } from "./client.js";

export type ReleaseMigrateHooks = {
  provisionOAuthClients: () => Promise<void>;
  provisionPlatformAdmins: () => Promise<void>;
};

function resolvePrismaCliEntry(): string {
  const require = createRequire(import.meta.url);
  return require.resolve("prisma/build/index.js");
}

export async function runReleaseMigrate(hooks: ReleaseMigrateHooks): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const prismaCliEntry = resolvePrismaCliEntry();

  execFileSync(process.execPath, [prismaCliEntry, "migrate", "deploy"], {
    cwd: packageRoot,
    env: process.env,
    stdio: "inherit",
  });

  await applySqlFunctions(databaseUrl);

  const backfillResult = await backfillDefaultPhoneCountry(prisma);
  if (backfillResult.updated > 0) {
    process.stdout.write(
      `Backfilled default_phone_country for ${backfillResult.updated} user(s) (scanned ${backfillResult.scanned}).\n`,
    );
  }

  await hooks.provisionOAuthClients();
  await hooks.provisionPlatformAdmins();
}
