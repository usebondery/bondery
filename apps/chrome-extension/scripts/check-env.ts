import { checkEnvVariables } from "@bondery/helpers/check-env";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const environment = (process.env.NODE_ENV || "development") as "production" | "development";
const isCi = process.env.GITHUB_ACTIONS === "true" || process.env.CI === "true";

const requiredVars = ["NEXT_PUBLIC_WEBAPP_URL"];

if (environment === "production" && isCi) {
  requiredVars.push(
    "PRIVATE_CHROME_EXTENSION_ID",
    "PRIVATE_CHROME_PUBLISHER_ID",
    "PRIVATE_CHROME_PROJECT_ID",
    "PRIVATE_CHROME_SERVICE_ACCOUNT_EMAIL",
    "PRIVATE_CHROME_WORKLOAD_IDENTITY_PROVIDER",
    "PRIVATE_CHROME_PRIVATE_SIGNING_KEY",
    "PRIVATE_CHROME_PUBLIC_SIGNING_KEY",
  );
}

checkEnvVariables({
  environment,
  appPath: resolve(__dirname, ".."),
  requiredVars,
});
