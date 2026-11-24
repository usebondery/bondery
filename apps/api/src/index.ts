/**
 * Bondery API Server entry point.
 *
 * Telemetry starts first, then the server is loaded with a dynamic import. The order
 * matters: log shipping patches Pino as it is first required, so nothing that loads Pino
 * or Fastify may be loaded before `instrument.js` has run. Keep this file to these two
 * statements.
 */
import "./instrument.js";

await import("./main.js");
