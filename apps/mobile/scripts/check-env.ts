import { checkEnvVariables } from "@bondery/helpers/check-env";
import { existsSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const appPath = resolve(__dirname, "..");

// Expo uses .env.local as its primary local override file.
// Pre-load it into process.env so checkEnvVariables can find the vars
// (it reads .env.development.local but falls back to process.env).
const envLocalPath = resolve(appPath, ".env.local");
if (existsSync(envLocalPath)) {
  const content = readFileSync(envLocalPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex > 0) {
        const key = trimmed.slice(0, eqIndex).trim();
        const value = trimmed.slice(eqIndex + 1).trim();
        if (key && !(key in process.env)) {
          process.env[key] = value;
        }
      }
    }
  }
}

checkEnvVariables({
  environment: "development",
  appPath,
  requiredVars: [
    "EXPO_PUBLIC_API_URL",
    "EXPO_PUBLIC_SUPABASE_URL",
    "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  ],
});
