import { API_SECRET_ENTRIES } from "./manifest-entries-api-secrets.js";
import { AUTH_ENTRIES } from "./manifest-entries-auth.js";
import { PUBLIC_DATABASE_ENTRIES } from "./manifest-entries-public-database.js";
import { RUNTIME_ENTRIES } from "./manifest-entries-runtime.js";
import { STORAGE_ENTRIES } from "./manifest-entries-storage.js";
import type { EnvVarDef } from "./manifest-types.js";

/**
 * Every environment variable Bondery reads, in generated-file order.
 *
 * Entry order is load-bearing: `.env.example` files, `turbo.json` env arrays and docs are
 * derived from it. The area modules are concatenated in the order the groups appear.
 */
export const ENV_MANIFEST: EnvVarDef[] = [
  ...PUBLIC_DATABASE_ENTRIES,
  ...AUTH_ENTRIES,
  ...STORAGE_ENTRIES,
  ...API_SECRET_ENTRIES,
  ...RUNTIME_ENTRIES,
];
