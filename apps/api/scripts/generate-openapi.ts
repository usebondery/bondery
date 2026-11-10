/**
 * Generates openapi.yaml from the running Fastify server's Zod schemas.
 *
 * Usage: pnpm exec tsx scripts/generate-openapi.ts
 *
 * The generated file is consumed by GitBook via .gitbook.yaml.
 */

import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { applyApiBootEnv } from "@bondery/helpers/env";
import { stringify } from "yaml";
import { patchOpenApiErrorSchemas } from "./patch-openapi-error-schemas.js";
import { patchOpenApiRateLimitHeaders } from "./patch-openapi-rate-limit-headers.js";
import { patchOpenApiRequestExamples } from "./patch-openapi-request-examples.js";

applyApiBootEnv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const { buildApp } = await import("../src/build-app.js");
  const server = await buildApp();
  await server.ready();

  const spec = server.swagger();
  patchOpenApiErrorSchemas(spec);
  patchOpenApiRequestExamples(spec);
  patchOpenApiRateLimitHeaders(spec);
  const yamlContent = stringify(spec, { lineWidth: 120 });

  const outputPath = resolve(__dirname, "../../../packages/openapi-spec/openapi.yaml");
  writeFileSync(outputPath, yamlContent, "utf-8");

  console.log(`OpenAPI spec written to ${outputPath}`);
  // Exit before Better Auth OAuth resource seeding races against server.close()
  // when DATABASE_URL points at a dummy host during spec generation.
  process.exit(0);
}

main().catch((err) => {
  console.error("Failed to generate OpenAPI spec:", err);
  process.exit(1);
});
