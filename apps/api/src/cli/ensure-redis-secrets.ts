/**
 * One-shot Compose job (`redis-secrets`): create the bundled Redis password and TLS
 * certificate when they are missing. See lib/data/redis-secrets.ts.
 *
 * The volume mount path is fixed in deploy/bondery/docker-compose*.yml. The certificate covers
 * `${BONDERY_INFRA_TRAEFIK_PREFIX}-redis`, the hostname the API connects to.
 */

import { ensureRedisSecrets } from "../lib/data/redis-secrets.js";

const REDIS_SECRETS_MOUNT = "/bondery-redis";

async function main(): Promise<void> {
  const prefix = process.env.BONDERY_INFRA_TRAEFIK_PREFIX?.trim() || "bondery";
  const result = await ensureRedisSecrets({
    chownToContainerUsers: process.getuid?.() === 0,
    log: (message) => console.log(`redis-secrets: ${message}`),
    prefix,
    root: REDIS_SECRETS_MOUNT,
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
