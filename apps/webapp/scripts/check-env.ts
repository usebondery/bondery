import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkEnvVariables } from "@bondery/helpers/env";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const environment = (process.env.NODE_ENV || "development") as "production" | "development";

checkEnvVariables({
  appPath: resolve(__dirname, ".."),
  environment,
  requiredVars: [
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_WEBAPP_URL",
    "NEXT_PUBLIC_API_URL",
    "NEXT_PUBLIC_WEBSITE_URL",
  ],
});
