import path from "node:path";
import { fileURLToPath } from "node:url";
import { createOpenAPI } from "fumadocs-openapi/server";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

/** Forward slashes so generated MDX YAML `document` is not corrupted by Windows `\U` escapes. */
function posixPath(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

export const openapi = createOpenAPI({
  input: [posixPath(path.join(repoRoot, "packages/openapi-spec/openapi.yaml"))],
});
