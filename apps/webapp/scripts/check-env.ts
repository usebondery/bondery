import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkEnvVariables } from "@bondery/helpers/env";
import { WEBAPP_RUNTIME_REQUIRED_ENV } from "../src/lib/platform/runtimeConfig.env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const environment = (process.env.NODE_ENV || "development") as "production" | "development";

checkEnvVariables({
  appPath: resolve(__dirname, ".."),
  environment,
  requiredVars: [...WEBAPP_RUNTIME_REQUIRED_ENV],
});
