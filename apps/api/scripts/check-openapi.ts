/**
 * Verifies generated OpenAPI spec is fresh and meets documentation quality rules.
 *
 * Usage: npx tsx scripts/check-openapi.ts
 */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiRoot = join(__dirname, "..");
const specPath = join(apiRoot, "openapi.yaml");

execSync("npx tsx scripts/generate-openapi.ts", {
  cwd: apiRoot,
  stdio: "inherit",
});

try {
  execSync("git diff --exit-code openapi.yaml", { cwd: apiRoot, stdio: "pipe" });
} catch {
  console.error("openapi.yaml is out of date. Run: npm run generate-openapi -w apps/api");
  process.exit(1);
}

const spec = parse(readFileSync(specPath, "utf8")) as {
  paths?: Record<
    string,
    Record<
      string,
      {
        responses?: Record<
          string,
          {
            description?: string;
            content?: Record<
              string,
              { schema?: unknown; example?: unknown }
            >;
          }
        >;
      }
    >
  >;
};

const violations: string[] = [];

function isEmptySchema(schema: unknown): boolean {
  return (
    schema === undefined ||
    (typeof schema === "object" &&
      schema !== null &&
      !Array.isArray(schema) &&
      Object.keys(schema).length === 0)
  );
}

for (const [path, methods] of Object.entries(spec.paths ?? {})) {
  for (const [method, operation] of Object.entries(methods)) {
    if (method === "parameters") continue;

    const responses = operation.responses ?? {};
    for (const [status, response] of Object.entries(responses)) {
      if (response.description === "Default Response") {
        violations.push(`${method.toUpperCase()} ${path} ${status}: Default Response`);
      }

      const statusCode = Number(status);
      if (!Number.isInteger(statusCode)) {
        continue;
      }

      const jsonContent = response.content?.["application/json"];
      if (!jsonContent) {
        continue;
      }

      const isSuccess = statusCode >= 200 && statusCode < 300;
      const isError = statusCode >= 400;

      if (!isSuccess && !isError) {
        continue;
      }

      if (isEmptySchema(jsonContent.schema)) {
        violations.push(
          `${method.toUpperCase()} ${path} ${status}: empty or missing application/json schema`,
        );
      }

      if (jsonContent.example === undefined) {
        violations.push(
          `${method.toUpperCase()} ${path} ${status}: missing application/json example`,
        );
      }
    }
  }
}

if (violations.length > 0) {
  console.error("OpenAPI quality check failed:\n" + violations.map((v) => `  - ${v}`).join("\n"));
  process.exit(1);
}

console.log("check-openapi: ok");
