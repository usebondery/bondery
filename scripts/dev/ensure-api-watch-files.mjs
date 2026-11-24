/**
 * Create the files `apps/api` dev mode watches, when they are missing.
 *
 * `node --watch-path` fails on a path that does not exist, and the translations stamp only
 * appears after the first locale edit. Run before the API starts.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const stampPath = resolve(repoRoot, ".temp/translations-email-stamp.json");

if (!existsSync(stampPath)) {
  mkdirSync(dirname(stampPath), { recursive: true });
  writeFileSync(stampPath, `${JSON.stringify({ changedAt: 0 })}\n`);
}
