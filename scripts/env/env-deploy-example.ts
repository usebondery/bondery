import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { createCliLogger } from "@bondery/helpers/cli";
import { DEPLOY_GENERATED_HEADER, formatEnvFile } from "./env-file-format.js";
import {
  DEPLOY_GROUP_GUIDES,
  ENV_MANIFEST,
  resolveExampleValue,
  sortDeployExampleRows,
} from "./env-manifest.ts";

export function collectDeployExampleRows(infraPinVersion: string) {
  const rows = [];
  for (const entry of ENV_MANIFEST) {
    const deploy = entry.deployExample;
    if (!deploy?.include) {
      continue;
    }
    const group = deploy.group ?? entry.group;
    let value = resolveExampleValue(entry, "deploy");
    if (entry.canonical === "BONDERY_INFRA_VERSION") {
      // Last production X.Y.Z only — never an RC string (self-host channel).
      value = infraPinVersion;
    }
    rows.push({
      commented: deploy.commented ?? false,
      description: entry.description,
      group,
      key: entry.canonical,
      value,
    });
  }
  return sortDeployExampleRows(rows);
}

export function writeDeployExample(
  repoRoot: string,
  dryRun: boolean,
  infraPinVersion: string,
  log: ReturnType<typeof createCliLogger>,
) {
  const rows = collectDeployExampleRows(infraPinVersion);
  const deployPath = join(repoRoot, "deploy/bondery/.env.example");
  const body = formatEnvFile(rows, {
    groupGuides: DEPLOY_GROUP_GUIDES,
    header: DEPLOY_GENERATED_HEADER,
    includeDescriptions: false,
  });
  if (!dryRun) {
    writeFileSync(deployPath, body, "utf-8");
  }
  log.info(`${dryRun ? "Would write" : "Wrote"} ${deployPath}`);
}
