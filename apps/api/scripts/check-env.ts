import { checkEnvVariables } from "@bondery/helpers/check-env";
import { resolve } from "path";

const environment = (process.env.NODE_ENV || "development") as "production" | "development";

checkEnvVariables({
  environment,
  appPath: resolve(__dirname, ".."),
  requiredVars: [
    "PUBLIC_SUPABASE_URL",
    "PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_API_URL",
    "PRIVATE_SUPABASE_SECRET_KEY",
    "PRIVATE_EMAIL_HOST",
    "PRIVATE_EMAIL_PORT",
    "PRIVATE_EMAIL_USER",
    "PRIVATE_EMAIL_PASS",
    "PRIVATE_EMAIL_ADDRESS",
  ],
});
