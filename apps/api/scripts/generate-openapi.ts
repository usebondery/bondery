/**
 * Generates openapi.yaml from the running Fastify server's Zod schemas.
 *
 * Usage: npx tsx scripts/generate-openapi.ts
 *
 * The generated file is consumed by GitBook via .gitbook.yaml.
 */

// Prevent the auto-start guard in index.ts from starting the server.
// Must be set before the dynamic import so the guard sees it.
process.env.GENERATE_OPENAPI = "true";

// Provide dummy values for required env vars so @fastify/env validation passes
// without needing a local .env file. None of these are used during spec generation.
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://localhost:54321";
process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= "dummy";
process.env.PRIVATE_SUPABASE_SECRET_KEY ??= "dummy";
process.env.NEXT_PUBLIC_API_URL ??= "http://localhost:3001";
process.env.PRIVATE_EMAIL_HOST ??= "localhost";
process.env.PRIVATE_EMAIL_USER ??= "dummy";
process.env.PRIVATE_EMAIL_PASS ??= "dummy";
process.env.PRIVATE_EMAIL_ADDRESS ??= "dummy@localhost";
process.env.PRIVATE_EMAIL_PORT ??= "587";
process.env.POLAR_WEBHOOK_SECRET ??= "dummy";
process.env.PRIVATE_API_KEY_PEPPER ??= "dummy-pepper-for-openapi-generation";
process.env.PRIVATE_SUPABASE_JWT_SIGNING_JWK ??=
  '{"kty":"EC","x":"-ztnrq2xtqWzVslfvYg9Ehds97TWbhD6pFWcYJJKFLA","y":"foLtmAT7OJud7d9ltwZuF9podzkTEhyD56tiDRZFSZQ","crv":"P-256","d":"_bKhwEFYFXeOH3IOBLtT0PS7NSDkWP6xbrqWtj37u2A","alg":"ES256","kid":"openapi-dummy","use":"sig"}';

import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { stringify } from "yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const { buildServer } = await import("../src/index.js");
  const server = await buildServer();
  await server.ready();

  const spec = server.swagger();
  const yamlContent = stringify(spec, { lineWidth: 120 });

  const outputPath = resolve(__dirname, "..", "openapi.yaml");
  writeFileSync(outputPath, yamlContent, "utf-8");

  console.log(`OpenAPI spec written to ${outputPath}`);
  await server.close();
}

main().catch((err) => {
  console.error("Failed to generate OpenAPI spec:", err);
  process.exit(1);
});
