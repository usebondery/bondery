/**
 * Reads the local Supabase service role key from `supabase status` and
 * prints it to the console.
 *
 * Usage:
 *   npm run get:service-key
 */

import { execSync } from "child_process";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

let output: string;
try {
  output = execSync("npx supabase status", { cwd: root, encoding: "utf-8" });
} catch (e: any) {
  output = e.stdout ?? "";
  if (!output) {
    console.error("❌ Could not run supabase status. Is the local instance running?");
    process.exit(1);
  }
}

// Matches both sb_secret_... and legacy ey... JWT formats
const match = output.match(/Secret\s*[│|]\s*(\S+)/);
if (!match) {
  console.error("❌ Could not parse service role key from supabase status output.");
  process.exit(1);
}

console.log(match[1].trim());
