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
    data,
    hypothesisId,
    location,
    message,
    runId: process.env.DEBUG_RUN_ID ?? "probe",
    sessionId: SESSION,
    timestamp: Date.now(),
  };
  const line = `${JSON.stringify(entry)}\n`;
  appendFileSync(LOG_PATH, line, "utf8");
  fetch(INGEST, {
    body: JSON.stringify(entry),
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": SESSION },
    method: "POST",
  }).catch(() => {});
}

const probes = [
  { hypothesisId: "A", id: "A", label: "root barrel", spec: "@bondery/schemas" },
  { hypothesisId: "B", id: "B", label: "entities barrel", spec: "@bondery/schemas/entities" },
  { hypothesisId: "C", id: "C", label: "geocode", spec: "@bondery/schemas/geocode" },
  { hypothesisId: "D", id: "D", label: "http (api-only)", spec: "@bondery/schemas/http" },
  { hypothesisId: "E", id: "E", label: "helpers root", spec: "@bondery/helpers" },
  { hypothesisId: "F", id: "F", label: "helpers/forms", spec: "@bondery/helpers/forms" },
  {
    hypothesisId: "G",
    id: "G",
    label: "contact entity",
    spec: "@bondery/schemas/entities/contact",
  },
  {
    hypothesisId: "H",
    id: "H",
    label: "schema-examples fixture",
    spec: "@bondery/schemas/openapi/fixtures/schema-examples",
  },
];

log("INIT", "debug-schemas-ssr-init.mjs", "probe start", { probeCount: probes.length });

for (const probe of probes) {
  try {
    const mod = await import(probe.spec);
    log(probe.hypothesisId, "debug-schemas-ssr-init.mjs", "import ok", {
      exportCount: Object.keys(mod).length,
      label: probe.label,
      probe: probe.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    log(probe.hypothesisId, "debug-schemas-ssr-init.mjs", "import failed", {
      error: message,
      label: probe.label,
      probe: probe.id,
      stack: stack?.split("\n").slice(0, 6),
    });
    console.error(`[FAIL] ${probe.label}: ${message}`);
  }
}

log("INIT", "debug-schemas-ssr-init.mjs", "probe complete", {});
