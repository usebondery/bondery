/**
 * Canonical environment variable contract for the Bondery monorepo.
 *
 * Humans edit root `.env.local` using these canonical names.
 * `pnpm run env` copies identity (or documented aliases) into per-app files.
 *
 * Naming:
 * - BONDERY_PUBLIC_*  — safe for clients
 * - BONDERY_PRIVATE_* — secrets (API / auth setup)
 * - BONDERY_INFRA_*   — deploy / runtime plumbing
 * - BONDERY_DEV_*     — local API dev boot only (never set in Compose/production)
 * - BONDERY_OPS_*     — CI only (never synced into app local files)
 *
 * This module is the public entry point. The contract lives in sibling modules:
 * - `manifest-types.ts`: types and the `EnvVarDef` shape
 * - `manifest-entries-*.ts`: the variable definitions, split by area
 * - `manifest-entries.ts`: `ENV_MANIFEST`, the area modules concatenated in order
 * - `manifest-group-guides.ts`, `manifest-example-values.ts`: generated-example comments and ordering
 * - `manifest-targets.ts`: per-app sync targets and value transforms
 * - `manifest-ops-keys.ts`, `manifest-dokploy.ts`: CI and Dokploy sync
 * - `manifest-queries.ts`: lookups over `ENV_MANIFEST`
 */

export type { DokploySyncRow, DokploySyncTargetConfig } from "./manifest-dokploy.js";
export {
  collectDokploySyncRows,
  collectOpsSyncRows,
  DOKPLOY_SYNC_TARGETS,
  entrySyncsToDokployTarget,
  getDokploySyncWebhookBranch,
  resolveDokploySyncPayloadTarget,
  SERVICES_DOKPLOY_SYNC_EXCLUDE,
} from "./manifest-dokploy.js";
export { ENV_MANIFEST } from "./manifest-entries.js";
export {
  DEPLOY_GROUP_ORDER,
  OPS_GROUP_ORDER,
  PLAUSIBLE_GROUP_ORDER,
  resolveExampleValue,
  sortDeployExampleRows,
  sortOpsExampleRows,
  sortPlausibleExampleRows,
} from "./manifest-example-values.js";
export {
  DEPLOY_GROUP_GUIDES,
  ENV_GROUP_GUIDES,
  OPS_GROUP_GUIDES,
  PLAUSIBLE_GROUP_GUIDES,
} from "./manifest-group-guides.js";
export {
  OPS_DOKPLOY_SYNC_CONFIG_KEYS,
  OPS_ENV_VARS,
  TURBO_SYSTEM_PASSTHROUGH,
} from "./manifest-ops-keys.js";
export {
  getAllRuntimeNames,
  getRequiredVarsForTarget,
  getRuntimeNamesForTarget,
  getSyncableEnvVars,
  resolveCanonicalValue,
} from "./manifest-queries.js";
export {
  applyTransform,
  buildLocalPostgresDatabaseUrl,
  EXAMPLE_POSTGRES_PASSWORD,
  SYNC_TARGETS,
} from "./manifest-targets.js";
export type {
  BootExample,
  DeployExample,
  DokploySync,
  DokploySyncTarget,
  EnvEnvironment,
  EnvTargetWrite,
  EnvVarDef,
  ExampleProfile,
  OpsExample,
  PlausibleExample,
  SyncTargetConfig,
  TargetId,
} from "./manifest-types.js";
