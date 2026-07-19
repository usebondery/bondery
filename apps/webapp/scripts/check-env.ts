import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkEnvVariables, getRequiredVarsForTarget } from "@bondery/helpers/env";
import { loadEnvConfig } from "@next/env";
import { WEBAPP_RUNTIME_REQUIRED_ENV } from "../src/lib/platform/runtimeConfig.env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const appPath = resolve(__dirname, "..");

const environment = (process.env.NODE_ENV || "development") as "production" | "development";
loadEnvConfig(appPath, environment !== "production");

const fromManifest = getRequiredVarsForTarget("webapp", environment);
for (const key of WEBAPP_RUNTIME_REQUIRED_ENV) {
  if (!fromManifest.includes(key)) {
    console.error(`WEBAPP_RUNTIME_REQUIRED_ENV key missing from manifest: ${key}`);
    process.exit(1);
  }
}

checkEnvVariables({
  appPath,
  environment,
  requiredVars: [...WEBAPP_RUNTIME_REQUIRED_ENV],
});
