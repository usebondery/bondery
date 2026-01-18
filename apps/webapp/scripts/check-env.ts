import { checkEnvVariables } from "@bondery/helpers";
import { resolve } from "path";

const environment = (process.env.NODE_ENV || "development") as "production" | "development";

checkEnvVariables({
  environment,
  appPath: resolve(__dirname, ".."),
  requiredVars: [
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_WEBAPP_URL",
    "NEXT_PUBLIC_API_URL",
    "NEXT_PUBLIC_WEBSITE_URL",
  ],
});
