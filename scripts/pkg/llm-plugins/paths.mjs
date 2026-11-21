import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Repository root, resolved from this module at `scripts/pkg/llm-plugins`. */
export function repoRoot() {
  return resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
}
