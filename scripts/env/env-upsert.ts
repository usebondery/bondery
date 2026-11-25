import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { quoteEnvValue } from "./env-file-format.js";

/** Upsert key=value assignments into a dotenv file (preserves unrelated lines). */
export function upsertEnvAssignments(path: string, updates: Record<string, string>) {
  let content = existsSync(path) ? readFileSync(path, "utf-8") : "";
  for (const [key, value] of Object.entries(updates)) {
    const line = `${key}=${quoteEnvValue(value)}`;
    const re = new RegExp(`^${key}=.*$`, "mu");
    if (re.test(content)) {
      content = content.replace(re, line);
    } else {
      content = `${content.trimEnd()}\n${line}\n`;
    }
  }
  writeFileSync(path, content.endsWith("\n") ? content : `${content}\n`, "utf-8");
}
