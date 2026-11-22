import { DEV_PORTS } from "@bondery/schemas/constants/dev-ports";
import type { EnvTargetWrite, SyncTargetConfig, TargetId } from "./manifest-types.js";

const TRAILING_SLASH_RE = /\/$/;
const LOCAL_POSTGRES_DB = "bondery";
const LOCAL_POSTGRES_HOST = "127.0.0.1";
const LOCAL_POSTGRES_USER = "postgres";

/** Where `pnpm run env:development` / `pnpm run env:production` write per-app local files */
export const SYNC_TARGETS: SyncTargetConfig[] = [
  {
    devFile: "apps/api/.env.development.local",
    exampleFile: "apps/api/.env.development.example",
    id: "api",
    productionExampleFile: "apps/api/.env.production.example",
    productionFile: "apps/api/.env.production.local",
  },
  {
    devFile: "apps/webapp/.env.development.local",
    exampleFile: "apps/webapp/.env.development.example",
    id: "webapp",
    productionExampleFile: "apps/webapp/.env.production.example",
    productionFile: "apps/webapp/.env.production.local",
  },
  {
    devFile: "apps/website/.env.development.local",
    exampleFile: "apps/website/.env.development.local.example",
    id: "website",
    productionExampleFile: "apps/website/.env.production.local.example",
    productionFile: "apps/website/.env.production.local",
  },
  {
    devFile: "apps/mobile/.env.local",
    exampleFile: "apps/mobile/.env.example",
    id: "mobile",
  },
  {
    devFile: "apps/chrome-extension/.env.development.local",
    exampleFile: "apps/chrome-extension/.env.development.example",
    id: "chrome-extension",
    productionExampleFile: "apps/chrome-extension/.env.production.example",
    productionFile: "apps/chrome-extension/.env.production.local",
  },
  {
    devFile: "packages/db/.env.local",
    exampleFile: "packages/db/.env.local.example",
    id: "db",
  },
];

/** Target write shorthand used by the entry modules. */
export function t(id: TargetId, runtimeName?: string): EnvTargetWrite {
  return runtimeName ? { id, runtimeName } : { id };
}

export const EXAMPLE_POSTGRES_PASSWORD: string = "your-super-secret-and-long-postgres-password";

/** Bundled local Postgres URL for `pnpm run env` derivation (matches `docker-compose.dev-db.yml`). */
export function buildLocalPostgresDatabaseUrl(password: string): string {
  return `postgresql://${LOCAL_POSTGRES_USER}:${encodeURIComponent(password)}@${LOCAL_POSTGRES_HOST}:${DEV_PORTS.POSTGRES}/${LOCAL_POSTGRES_DB}`;
}

export function applyTransform(transform: EnvTargetWrite["transform"], value: string): string {
  const base = value.replace(TRAILING_SLASH_RE, "");
  if (transform === "webapp-auth-callback") {
    return `${base}/auth/callback`;
  }
  if (transform === "local-postgres-database-url") {
    return buildLocalPostgresDatabaseUrl(value);
  }
  return value;
}
