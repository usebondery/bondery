#!/usr/bin/env tsx
/**
 * Applies prisma/sql/functions.sql (extensions + custom Postgres functions)
 * against DATABASE_URL. Relocates pg_trgm/unaccent into schema `extensions`
 * first (idempotent). Run after `prisma migrate deploy`.
 *
 * Usage: tsx scripts/apply-sql-functions.ts
 */
import { pathToFileURL } from "node:url";
import { applySqlFunctions } from "../src/apply-sql-functions.js";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  await applySqlFunctions(databaseUrl);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { applySqlFunctions } from "../src/apply-sql-functions.js";
