import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function resolveOpenApiYamlPath(): string {
  try {
    return fileURLToPath(import.meta.resolve("@bondery/openapi-spec/openapi.yaml"));
  } catch {
    // Compiled Next routes are not at the source path; cwd is apps/website in dev and Docker.
    return path.join(process.cwd(), "../../packages/openapi-spec/openapi.yaml");
  }
}

const OPENAPI_YAML = readFileSync(/*turbopackIgnore: true*/ resolveOpenApiYamlPath());

export const revalidate = false;

export function GET() {
  return new Response(OPENAPI_YAML, {
    headers: {
      "Cache-Control": "max-age=86400",
      "Content-Type": "application/yaml; charset=utf-8",
    },
  });
}
