/**
 * Create the Redis password and TLS certificate when they are missing. See lib/data/redis-secrets.ts.
 *
 * - Compose job `redis-secrets` (no arguments): writes into the volume at /bondery-redis. The
 *   certificate covers `${BONDERY_INFRA_TRAEFIK_PREFIX}-redis`, the hostname the API connects to.
 * - Local development (`pnpm run redis:secrets`): `--local-dev --dir <folder>` writes into a host
 *   folder that deploy/bondery/docker-compose.dev-redis.yml mounts.
 */

import { resolve } from "node:path";

import { ensureRedisSecrets } from "../lib/data/redis-secrets.js";

const REDIS_SECRETS_MOUNT = "/bondery-redis";

function readDirArgument(args: string[]): string | undefined {
  const index = args.indexOf("--dir");
  if (index === -1) {
    return undefined;
  }
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error("--dir needs a folder path");
  }
  return resolve(value);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const localDev = args.includes("--local-dev");
  const dir = readDirArgument(args);
  if (localDev && !dir) {
    throw new Error("--local-dev needs --dir <folder>");
  }
  const prefix = process.env.BONDERY_INFRA_TRAEFIK_PREFIX?.trim() || "bondery";
  const result = await ensureRedisSecrets({
    chownToContainerUsers: !localDev && process.getuid?.() === 0,
    localDev,
    log: (message) => console.log(`redis-secrets: ${message}`),
    prefix,
    root: dir ?? REDIS_SECRETS_MOUNT,
  });
  if (!(result.certificateGenerated || result.passwordGenerated)) {
    console.log("redis-secrets: existing password and certificate are valid");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
