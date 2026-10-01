import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkEnvVariables,
  ENV_MANIFEST,
  getBootEnvVarNames,
  getBootIncludeExtraVarNames,
  getRequiredVarsForTarget,
  resolveBootEnvValue,
} from "@bondery/helpers/env";
import { assertDistinctFirstPartyOAuthClientIds } from "@bondery/helpers/env/oauth-client-ids";
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

const bootDevNames = getBootEnvVarNames("api", "development");
const bootDevExpected = [
  ...new Set([
    ...getRequiredVarsForTarget("api", "development"),
    ...getBootIncludeExtraVarNames("api", "development"),
  ]),
].sort();

if (!sameSet(bootDevNames, bootDevExpected)) {
  console.error("API boot-env name drift vs manifest (development):");
  console.error(
    `  only in boot helper: ${bootDevNames.filter((k) => !bootDevExpected.includes(k)).join(", ") || "(none)"}`,
  );
  console.error(
    `  only in expected: ${bootDevExpected.filter((k) => !bootDevNames.includes(k)).join(", ") || "(none)"}`,
  );
  process.exit(1);
}

for (const name of bootDevNames) {
  const entry = ENV_MANIFEST.find(
    (e) =>
      e.canonical === name ||
      e.targets.some((t) => t.id === "api" && (t.runtimeName ?? e.canonical) === name),
  );
  if (!entry) {
    console.error(`API boot-env: no manifest entry for ${name}`);
    process.exit(1);
  }
  const value = resolveBootEnvValue(entry);
  if (!value.trim()) {
    console.error(
      `API boot-env: ${name} resolves to empty — add boot.value on manifest entry ${entry.canonical}`,
    );
    process.exit(1);
  }
}

checkEnvVariables({
  appPath: resolve(__dirname, ".."),
  environment,
  requiredVars: fromModule,
});

assertDistinctFirstPartyOAuthClientIds(
  process.env.BONDERY_PUBLIC_OAUTH_CLIENT_ID,
  process.env.BONDERY_PUBLIC_WEBAPP_OAUTH_CLIENT_ID,
);
