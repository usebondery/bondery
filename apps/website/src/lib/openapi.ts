import path from "node:path";
import { fileURLToPath } from "node:url";
import { createOpenAPI } from "fumadocs-openapi/server";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

const OPENAPI_DOCUMENT = path.join(repoRoot, "packages/openapi-spec/openapi.yaml");

/** Forward slashes so generated MDX YAML `document` is not corrupted by Windows `\U` escapes. */
function posixPath(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

export const openapi = createOpenAPI({
  input: [posixPath(OPENAPI_DOCUMENT)],
});

/**
 * Parsed OpenAPI document, keyed by the id a generated page names.
 *
 * Generated pages carry an absolute document path. `openapi.getSchema` only
 * caches ids listed in `input`, so each call re-parsed the YAML — one parse per
 * page, and 125 of them inside `llms-full.txt`. Parse once here instead.
 */
const documentCache = new Map<string, ReturnType<typeof openapi.getSchema>>();

export function loadOpenApiDocument(documentId: string): ReturnType<typeof openapi.getSchema> {
  const cached = documentCache.get(documentId);

  if (cached) {
    return cached;
  }

  const pending = openapi.getSchema(documentId);
  documentCache.set(documentId, pending);

  return pending;
}
