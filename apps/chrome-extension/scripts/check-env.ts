import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkEnvVariables, getRequiredVarsForTarget } from "@bondery/helpers/env";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const environment = (process.env.NODE_ENV || "development") as "production" | "development";
const isCi = process.env.GITHUB_ACTIONS === "true" || process.env.CI === "true";

const requiredVars = [...getRequiredVarsForTarget("chrome-extension", environment)];

if (environment === "production" && isCi) {
  requiredVars.push(
    "BONDERY_OPS_CHROME_EXTENSION_ID",
    "BONDERY_OPS_CHROME_PUBLISHER_ID",
    "PRIVATE_CHROME_SERVICE_ACCOUNT_KEY_JSON",
    "PRIVATE_CHROME_PRIVATE_SIGNING_KEY",
  );
}

checkEnvVariables({
  appPath: resolve(__dirname, ".."),
  environment,
  requiredVars,
});
