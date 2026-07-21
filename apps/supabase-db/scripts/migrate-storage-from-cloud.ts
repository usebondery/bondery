/**
 * Copy storage objects from a source Supabase project to a destination.
 *
 * Usage (from repo root):
 *   SOURCE_SUPABASE_URL=https://xxx.supabase.co \
 *   SOURCE_SERVICE_ROLE_KEY=... \
 *   DEST_SUPABASE_URL=https://supabase.example.com \
 *   DEST_SERVICE_ROLE_KEY=... \
 *   npx tsx apps/supabase-db/scripts/migrate-storage-from-cloud.ts
 *
 * Buckets: avatars, linkedin_logos (override with BUCKETS=a,b)
 */

// One-off ops script — env names are intentional and not part of the app turbo graph.
// biome-ignore-all lint/suspicious/noUndeclaredEnvVars: migration CLI env contract

import { createClient } from "@supabase/supabase-js";

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(
      "Required env: SOURCE_SUPABASE_URL, SOURCE_SERVICE_ROLE_KEY, DEST_SUPABASE_URL, DEST_SERVICE_ROLE_KEY",
    );
    process.exit(1);
  }
  return value;
}

const sourceUrl = requiredEnv("SOURCE_SUPABASE_URL");
const sourceKey = requiredEnv("SOURCE_SERVICE_ROLE_KEY");
const destUrl = requiredEnv("DEST_SUPABASE_URL");
const destKey = requiredEnv("DEST_SERVICE_ROLE_KEY");
const buckets = (process.env.BUCKETS ?? "avatars,linkedin_logos")
  .split(",")
  .map((b) => b.trim())
  .filter(Boolean);

const source = createClient(sourceUrl, sourceKey);
const dest = createClient(destUrl, destKey);

async function listAll(bucket: string, prefix = ""): Promise<string[]> {
  const paths: string[] = [];
  const { data, error } = await source.storage.from(bucket).list(prefix, {
    limit: 1000,
  });
  if (error) {
    throw new Error(`list ${bucket}/${prefix}: ${error.message}`);
  }
  for (const entry of data ?? []) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    // Folders have id null and no metadata in some API versions
    if (entry.id === null && !entry.metadata) {
      paths.push(...(await listAll(bucket, path)));
    } else {
      paths.push(path);
    }
  }
  return paths;
}

async function copyBucket(bucket: string) {
  console.log(`\nBucket: ${bucket}`);
  const { error: ensureErr } = await dest.storage.createBucket(bucket, {
    public: true,
  });
  if (ensureErr && !/already exists/i.test(ensureErr.message)) {
    console.warn(`  createBucket: ${ensureErr.message}`);
  }

  const paths = await listAll(bucket);
  console.log(`  ${paths.length} objects`);
  let ok = 0;
  let fail = 0;
  for (const path of paths) {
    const { data, error } = await source.storage.from(bucket).download(path);
    if (error || !data) {
      console.error(`  FAIL download ${path}: ${error?.message}`);
      fail += 1;
      continue;
    }
    const buffer = Buffer.from(await data.arrayBuffer());
    const { error: upErr } = await dest.storage.from(bucket).upload(path, buffer, {
      upsert: true,
    });
    if (upErr) {
      console.error(`  FAIL upload ${path}: ${upErr.message}`);
      fail += 1;
      continue;
    }
    ok += 1;
  }
  console.log(`  done: ${ok} ok, ${fail} failed`);
  return { fail, ok, total: paths.length };
}

async function main() {
  console.log(`Source: ${sourceUrl}`);
  console.log(`Dest:   ${destUrl}`);
  const summary = [];
  for (const bucket of buckets) {
    summary.push(await copyBucket(bucket));
  }
  const failed = summary.reduce((n, s) => n + s.fail, 0);
  const total = summary.reduce((n, s) => n + s.total, 0);
  console.log(`\nSummary: ${total} objects, ${failed} failures`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
