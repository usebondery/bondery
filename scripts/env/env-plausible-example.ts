import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { createCliLogger } from "@bondery/helpers/cli";
import { type EnvFileVar, formatEnvFile, PLAUSIBLE_GENERATED_HEADER } from "./env-file-format.js";
import {
  ENV_MANIFEST,
  PLAUSIBLE_GROUP_GUIDES,
  resolveExampleValue,
  sortPlausibleExampleRows,
} from "./env-manifest.ts";

export function collectPlausibleExampleRows() {
  const rows: EnvFileVar[] = [];
  for (const entry of ENV_MANIFEST) {
    const plausible = entry.plausibleExample;
    if (!plausible?.include) {
      continue;
    }
    const group = plausible.group ?? entry.group;
    const value = resolveExampleValue(entry, "plausible");
    rows.push({
      commented: plausible.commented ?? false,
      description: entry.description,
      group,
      key: entry.canonical,
      value,
    });
  }
  return sortPlausibleExampleRows(rows);
}

export function writePlausibleExample(
  repoRoot: string,
  dryRun: boolean,
  log: ReturnType<typeof createCliLogger>,
) {
  const rows = collectPlausibleExampleRows();
  const plausiblePath = join(repoRoot, "deploy/plausible/.env.example");
  const body = formatEnvFile(rows, {
    groupGuides: PLAUSIBLE_GROUP_GUIDES,
    header: PLAUSIBLE_GENERATED_HEADER,
    includeDescriptions: false,
  });
  if (!dryRun) {
    writeFileSync(plausiblePath, body, "utf-8");
  }
  log.info(`${dryRun ? "Would write" : "Wrote"} ${plausiblePath}`);
}
