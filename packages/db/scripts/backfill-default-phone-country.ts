#!/usr/bin/env tsx
/**
 * Backfill user_settings.default_phone_country from timezone where still null.
 *
 * Also runs automatically in `release-migrate` after schema migrations.
 *
 * Usage: DATABASE_URL=... tsx packages/db/scripts/backfill-default-phone-country.ts
 */
import { backfillDefaultPhoneCountry } from "../src/backfills/default-phone-country.js";
import { prisma } from "../src/client.js";

async function main() {
  const result = await backfillDefaultPhoneCountry(prisma);
  console.log(
    `Backfilled default_phone_country for ${result.updated} user(s) (scanned ${result.scanned}).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
