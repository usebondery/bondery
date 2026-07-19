import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkEnvVariables, getRequiredVarsForTarget } from "@bondery/helpers/env";
import { loadEnvConfig } from "@next/env";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const appPath = resolve(__dirname, "..");

const environment = (process.env.NODE_ENV || "development") as "production" | "development";
loadEnvConfig(appPath, environment !== "production");

checkEnvVariables({
  appPath,
  environment,
  requiredVars: getRequiredVarsForTarget("website", environment),
});
