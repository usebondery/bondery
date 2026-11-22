/**
 * Create the Redis password, CA, and TLS certificates when they are missing.
 * See lib/data/redis-secrets.ts.
 *
 * - Compose job `stack-secrets` (no arguments): writes into /bondery-redis/{ca,server,client}.
 *   When /bondery-redis-legacy exists, the first run keeps that volume's password.
 * - Local development (`pnpm run redis:secrets`): `--local-dev --dir <folder>` writes into a host
 *   folder. The dev Redis container bind-mounts only the server directory.
 */

import { access } from "node:fs/promises";
import { resolve } from "node:path";

import { ensureRedisSecrets } from "../lib/data/redis-secrets.js";

const REDIS_SECRETS_MOUNT = "/bondery-redis";
const REDIS_LEGACY_MOUNT = "/bondery-redis-legacy";

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

async function resolveLegacyRedisRoot(localDev: boolean): Promise<string | undefined> {
  let root: string | undefined;
  if (!localDev) {
    try {
      await access(REDIS_LEGACY_MOUNT);
      root = REDIS_LEGACY_MOUNT;
    } catch {
      // A new install has no legacy volume.
    }
  }
  return root;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const localDev = args.includes("--local-dev");
  const dir = readDirArgument(args);
  if (localDev && !dir) {
    throw new Error("--local-dev needs --dir <folder>");
  }
  const prefix = process.env["BONDERY_INFRA_TRAEFIK_PREFIX"]?.trim() || "bondery";
  const legacyRoot = await resolveLegacyRedisRoot(localDev);
  const result = await ensureRedisSecrets({
    chownToContainerUsers: !localDev && process.getuid?.() === 0,
    legacyRoot,
    localDev,
    log: (message) => console.log(`redis-secrets: ${message}`),
    prefix,
    root: dir ?? REDIS_SECRETS_MOUNT,
  });
  if (
    !(
      result.authorityGenerated ||
      result.clientCertificatesGenerated ||
      result.passwordGenerated ||
      result.serverCertificateGenerated
    )
  ) {
    console.log("redis-secrets: existing password and certificates are valid");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
