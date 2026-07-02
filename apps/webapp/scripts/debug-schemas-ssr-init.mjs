/**
 * Debug: probe @bondery/schemas submodules for TDZ / init-order failures.
 * Writes NDJSON to debug-e4d508.log and POSTs to the debug ingest server.
 */
import { appendFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_PATH = join(__dirname, "..", "..", "..", "debug-e4d508.log");
const INGEST = "http://127.0.0.1:7325/ingest/1bde7139-b916-4337-a35d-3f405e2a5241";
const SESSION = "e4d508";

function log(hypothesisId, location, message, data = {}) {
  const entry = {
    sessionId: SESSION,
    runId: process.env.DEBUG_RUN_ID ?? "probe",
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  };
  const line = `${JSON.stringify(entry)}\n`;
  appendFileSync(LOG_PATH, line, "utf8");
  fetch(INGEST, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": SESSION },
    body: JSON.stringify(entry),
  }).catch(() => {});
}

const probes = [
  { id: "A", hypothesisId: "A", label: "root barrel", spec: "@bondery/schemas" },
  { id: "B", hypothesisId: "B", label: "entities barrel", spec: "@bondery/schemas/entities" },
  { id: "C", hypothesisId: "C", label: "geocode", spec: "@bondery/schemas/geocode" },
  { id: "D", hypothesisId: "D", label: "http (api-only)", spec: "@bondery/schemas/http" },
  { id: "E", hypothesisId: "E", label: "helpers root", spec: "@bondery/helpers" },
  { id: "F", hypothesisId: "F", label: "helpers/forms", spec: "@bondery/helpers/forms" },
  { id: "G", hypothesisId: "G", label: "contact entity", spec: "@bondery/schemas/entities/contact" },
  { id: "H", hypothesisId: "H", label: "schema-examples fixture", spec: "@bondery/schemas/openapi/fixtures/schema-examples" },
];

log("INIT", "debug-schemas-ssr-init.mjs", "probe start", { probeCount: probes.length });

for (const probe of probes) {
  try {
    const mod = await import(probe.spec);
    log(probe.hypothesisId, "debug-schemas-ssr-init.mjs", "import ok", {
      probe: probe.id,
      label: probe.label,
      exportCount: Object.keys(mod).length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    log(probe.hypothesisId, "debug-schemas-ssr-init.mjs", "import failed", {
      probe: probe.id,
      label: probe.label,
      error: message,
      stack: stack?.split("\n").slice(0, 6),
    });
    console.error(`[FAIL] ${probe.label}: ${message}`);
  }
}

log("INIT", "debug-schemas-ssr-init.mjs", "probe complete", {});
