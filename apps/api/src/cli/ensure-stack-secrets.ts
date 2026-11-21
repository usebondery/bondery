/**
 * Create the secrets of the bundled services when they are missing: the Redis password and TLS
 * certificate (lib/data/redis-secrets.ts), the Postgres CA and TLS certificate
 * (lib/infra-secrets/postgres-secrets.ts), the SeaweedFS CA and cluster certificate
 * (lib/infra-secrets/storage-secrets.ts), and the CA and certificate of the API's internal
 * HTTPS listener (lib/infra-secrets/api-secrets.ts).
 *
 * - Compose job `stack-secrets` (no arguments): writes into the volumes mounted at
 *   /bondery-redis, /bondery-postgres/{ca,server,client}, /bondery-storage/{ca,cluster,client}
 *   and /bondery-api/{ca,server,client}. Certificates cover `${BONDERY_INFRA_TRAEFIK_PREFIX}-redis`,
 *   `-db`, `-storage` and `-api`, the hostnames clients connect to.
 * - Local development: `--only postgres --local-dev --dir <folder>` (`pnpm run postgres:secrets`)
 *   writes into a host folder that deploy/bondery/docker-compose.dev-db.yml mounts.
 *   `--only storage` (`pnpm run storage:secrets`) does the same for
 *   deploy/bondery/docker-compose.seaweedfs.dev.yml, `--only api` (`pnpm run api:secrets`) for
 *   the dev API and webapp, and `--only redis` for Redis (`ensure-redis-secrets.js` remains as
 *   an alias).
 */

import { resolve } from "node:path";

import { ensureRedisSecrets } from "../lib/data/redis-secrets.js";
import { ensureApiSecrets } from "../lib/infra-secrets/api-secrets.js";
import { ensurePostgresSecrets } from "../lib/infra-secrets/postgres-secrets.js";
import { ensureStorageSecrets } from "../lib/infra-secrets/storage-secrets.js";

type SecretsOptions = {
  chownToContainerUsers: boolean;
  localDev: boolean;
  log: (message: string) => void;
  prefix: string;
  root: string;
};

type SecretsJob = {
  /** Where the Compose job mounts this service's volumes. */
  mount: string;
  /** Creates what is missing; resolves true when it created or replaced anything. */
  run: (options: SecretsOptions) => Promise<boolean>;
  unchanged: string;
};

const JOBS = {
  api: {
    mount: "/bondery-api",
    run: async (options) => {
      const result = await ensureApiSecrets(options);
      return result.authorityGenerated || result.certificateGenerated;
    },
    unchanged: "existing CA and certificate are valid",
  },
  postgres: {
    mount: "/bondery-postgres",
    run: async (options) => {
      const result = await ensurePostgresSecrets(options);
      return result.authorityGenerated || result.serverCertificateGenerated;
    },
    unchanged: "existing CA and certificate are valid",
  },
  redis: {
    mount: "/bondery-redis",
    run: async (options) => {
      const result = await ensureRedisSecrets(options);
      return result.certificateGenerated || result.passwordGenerated;
    },
    unchanged: "existing password and certificate are valid",
  },
  storage: {
    mount: "/bondery-storage",
    run: async (options) => {
      const result = await ensureStorageSecrets(options);
      return result.authorityGenerated || result.certificateGenerated;
    },
    unchanged: "existing CA and certificate are valid",
  },
} satisfies Record<string, SecretsJob>;

type Service = keyof typeof JOBS;
const SERVICES = Object.keys(JOBS) as Service[];

function readValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) {
    return undefined;
  }
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} needs a value`);
  }
  return value;
}

function readServices(args: string[]): Service[] {
  const only = readValue(args, "--only");
  if (!only) {
    return [...SERVICES];
  }
  if (!(SERVICES as readonly string[]).includes(only)) {
    throw new Error(`--only must be one of: ${SERVICES.join(", ")}`);
  }
  return [only as Service];
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const localDev = args.includes("--local-dev");
  const dirArgument = readValue(args, "--dir");
  const dir = dirArgument ? resolve(dirArgument) : undefined;
  const services = readServices(args);
  if (localDev && !dir) {
    throw new Error("--local-dev needs --dir <folder>");
  }
  if (dir && services.length !== 1) {
    throw new Error(`--dir needs --only ${SERVICES.join("|")}`);
  }
  const prefix = process.env.BONDERY_INFRA_TRAEFIK_PREFIX?.trim() || "bondery";
  const chownToContainerUsers = !localDev && process.getuid?.() === 0;

  for (const service of services) {
    const job = JOBS[service];
    const log = (message: string) => console.log(`stack-secrets ${service}: ${message}`);
    const changed = await job.run({
      chownToContainerUsers,
      localDev,
      log,
      prefix,
      root: dir ?? job.mount,
    });
    if (!changed) {
      log(job.unchanged);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
