import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { PrismaClient as BasePrismaClient } from "./generated/prisma/client.js";
import { injectCreateIds } from "./inject-create-ids.js";

const globalForPrisma = globalThis as unknown as {
  pool?: Pool;
};

function resolveDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }
  return databaseUrl;
}

export function createPrismaPool(url: string): Pool {
  return new Pool({ connectionString: url });
}

function createPrismaClientFromPool(pool: Pool): BasePrismaClient {
  const adapter = new PrismaPg(pool);

  // Prisma 7.10 `$extends` + `$allModels` query hooks drop later model
  // delegates from the inferred type (e.g. `passkey`). The extension is
  // query-only, so the public surface stays the generated client.
  return new BasePrismaClient({ adapter }).$extends({
    query: {
      $allModels: {
        async create({ args, query }) {
          args.data = injectCreateIds(args.data);
          return query(args);
        },
        async createMany({ args, query }) {
          args.data = injectCreateIds(args.data);
          return query(args);
        },
        async upsert({ args, query }) {
          args.create = injectCreateIds(args.create);
          return query(args);
        },
      },
    },
  }) as unknown as BasePrismaClient;
}

export type PrismaClient = BasePrismaClient;

let prismaInstance: PrismaClient | null = null;

function ensurePrismaFromEnv(): PrismaClient {
  if (prismaInstance) {
    return prismaInstance;
  }

  const pool = globalForPrisma.pool ?? createPrismaPool(resolveDatabaseUrl());
  return initializePrisma(pool);
}

/**
 * Wire Prisma to an API-owned pool. Call once at boot before any queries.
 */
export function initializePrisma(pool: Pool): PrismaClient {
  if (prismaInstance) {
    return prismaInstance;
  }

  globalForPrisma.pool = pool;
  prismaInstance = createPrismaClientFromPool(pool);
  return prismaInstance;
}

export function getPrismaPool(): Pool | undefined {
  return globalForPrisma.pool;
}

/**
 * Singleton Prisma client. Lazily initializes from DATABASE_URL when not
 * explicitly wired via initializePrisma (CLI scripts, tests).
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = ensurePrismaFromEnv();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
  set(_target, prop, value) {
    const client = ensurePrismaFromEnv();
    Reflect.set(client, prop, value);
    return true;
  },
});

/** @internal Test-only reset. */
export function resetPrismaForTests(): void {
  prismaInstance = null;
  globalForPrisma.pool = undefined;
}

export type { PrismaClient as BasePrismaClient } from "./generated/prisma/client.js";
