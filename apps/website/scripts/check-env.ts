import { checkEnvVariables } from "@bondery/helpers/check-env";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const environment = (process.env.NODE_ENV || "development") as "production" | "development";

checkEnvVariables({
  environment,
  appPath: resolve(__dirname, ".."),
  requiredVars: ["NEXT_PUBLIC_WEBAPP_URL", "NEXT_PUBLIC_WEBSITE_URL"],
});
