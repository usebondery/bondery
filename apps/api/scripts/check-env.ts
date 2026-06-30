import { checkEnvVariables } from "@bondery/helpers/env";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const environment = (process.env.NODE_ENV || "development") as "production" | "development";

checkEnvVariables({
  environment,
  appPath: resolve(__dirname, ".."),
  requiredVars: [
    "NEXT_PUBLIC_SUPABASE_URL",
    "PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_API_URL",
    "PRIVATE_SUPABASE_SECRET_KEY",
    "PRIVATE_EMAIL_HOST",
    "PRIVATE_EMAIL_PORT",
    "PRIVATE_EMAIL_USER",
    "PRIVATE_EMAIL_PASS",
    "PRIVATE_EMAIL_ADDRESS",
    ...(environment === "production"
      ? [
          "PRIVATE_REDIS_URL",
          "PRIVATE_POLAR_ACCESS_TOKEN",
          "PRIVATE_POLAR_WEBHOOK_SECRET",
          "POLAR_PRODUCT_ID",
        ]
      : []),
    "PRIVATE_API_KEY_PEPPER",
    "PRIVATE_SUPABASE_JWT_SIGNING_JWK",
  ],
});
