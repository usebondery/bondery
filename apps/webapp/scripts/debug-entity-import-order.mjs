/**
 * Bisect entity barrel init order — logs first failure to debug-e4d508.log
 */
import { appendFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const LOG = join(repoRoot, "debug-e4d508.log");
const INGEST = "http://127.0.0.1:7325/ingest/1bde7139-b916-4337-a35d-3f405e2a5241";

function log(hypothesisId, message, data) {
  const entry = {
    data,
    hypothesisId,
    location: "debug-entity-import-order.mjs",
    message,
    runId: "entity-bisect",
    sessionId: "e4d508",
    timestamp: Date.now(),
  };
  appendFileSync(LOG, `${JSON.stringify(entry)}\n`);
  fetch(INGEST, {
    body: JSON.stringify(entry),
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "e4d508" },
    method: "POST",
  }).catch(() => {});
}

const modules = [
  "entities/_shared",
  "entities/address",
  "entities/channels",
  "entities/important-date",
  "entities/contact",
  "entities/api",
  "entities/activity",
  "entities/group",
  "entities/tag",
  "entities/chat",
  "entities/settings",
  "entities/subscription",
  "entities/merge",
  "entities/import",
  "entities/reminder",
  "entities/api-keys",
  "entities/notes",
  "entities/social",
];

log("A", "bisect start", { count: modules.length });

for (const mod of modules) {
  try {
    const m = await import(`@bondery/schemas/${mod}`);
    log("A", "module ok", { exports: Object.keys(m).length, mod });
  } catch (e) {
    log("A", "module FAILED", { error: e instanceof Error ? e.message : String(e), mod });
    console.error("FAIL", mod, e);
    process.exit(1);
  }
}

try {
  await import("@bondery/schemas");
  log("A", "root barrel ok", {});
} catch (e) {
  log("A", "root barrel FAILED", { error: e instanceof Error ? e.message : String(e) });
  process.exit(1);
}

console.log("all ok");
