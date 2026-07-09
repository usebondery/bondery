import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function loadRouteNonPluginFiles(): Set<string> {
  const raw = readFileSync(join(__dirname, "route-non-plugin-files.json"), "utf8");
  return new Set(JSON.parse(raw) as string[]);
}
