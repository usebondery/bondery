import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkEnvVariables, getRequiredVarsForTarget } from "@bondery/helpers/env";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const appPath = resolve(__dirname, "..");

// Expo uses .env.local as its primary local override file.
const envLocalPath = resolve(appPath, ".env.local");
if (existsSync(envLocalPath)) {
  const content = readFileSync(envLocalPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex > 0) {
        const key = trimmed.slice(0, eqIndex).trim();
        let value = trimmed.slice(eqIndex + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (key && !(key in process.env)) {
          process.env[key] = value;
        }
      }
    }
  }
}

checkEnvVariables({
  appPath,
  environment: "development",
  requiredVars: getRequiredVarsForTarget("mobile", "development"),
});
