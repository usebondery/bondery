import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkEnvVariables, getRequiredVarsForTarget } from "@bondery/helpers/env";
import { envSchema } from "../src/env-schema.js";
import { getApiRequiredEnvVars } from "../src/lib/platform/required-env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const environment = (process.env.NODE_ENV || "development") as "production" | "development";

const fromManifest = getRequiredVarsForTarget("api", environment);
const fromModule = [...getApiRequiredEnvVars(environment)];
const fromSchema = [...envSchema.required];

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const setB = new Set(b);
  return a.every((k) => setB.has(k));
}

if (!sameSet(fromManifest, fromModule)) {
  console.error("API required-env drift vs manifest:");
  console.error(
    `  only in manifest: ${fromManifest.filter((k) => !fromModule.includes(k)).join(", ") || "(none)"}`,
  );
  console.error(
    `  only in module: ${fromModule.filter((k) => !fromManifest.includes(k)).join(", ") || "(none)"}`,
  );
  process.exit(1);
}

const schemaDevRequired = [...getApiRequiredEnvVars("development")];
if (!sameSet(fromSchema, schemaDevRequired)) {
  console.error("API env-schema.required drift vs manifest (development):");
  console.error(
    `  only in schema: ${fromSchema.filter((k) => !schemaDevRequired.includes(k)).join(", ") || "(none)"}`,
  );
  console.error(
    `  only in manifest: ${schemaDevRequired.filter((k) => !fromSchema.includes(k)).join(", ") || "(none)"}`,
  );
  process.exit(1);
}

checkEnvVariables({
  appPath: resolve(__dirname, ".."),
  environment,
  requiredVars: fromModule,
});
