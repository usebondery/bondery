import { redisStorage } from "@better-auth/redis-storage";
import { requireRedisCommands } from "../data/redis.js";
import logger from "../platform/logger.js";

type RedisSecondaryStorage = ReturnType<typeof redisStorage>;

function warnSecondaryStorageError(operation: string, error: unknown): void {
  logger.warn({ err: error, operation }, "[auth-secondary-storage] operation failed");
}

export const BETTER_AUTH_REDIS_KEY_PREFIX = "bondery:auth:" as const;

/** @internal Exported for unit tests. */
export function wrapWithResilience(storage: RedisSecondaryStorage): RedisSecondaryStorage {
  return {
    async clear() {
      try {
        await storage.clear();
      } catch (error) {
        warnSecondaryStorageError("clear", error);
        throw error;
      }
    },
    async delete(key) {
      try {
        await storage.delete(key);
      } catch (error) {
        warnSecondaryStorageError("delete", error);
      }
    },
    async get(key) {
      try {
        return await storage.get(key);
      } catch (error) {
        warnSecondaryStorageError("get", error);
        return null;
      }
    },
    async getAndDelete(key) {
      try {
        return await storage.getAndDelete(key);
      } catch (error) {
        warnSecondaryStorageError("getAndDelete", error);
        return null;
      }
    },
    async increment(key, ttl) {
      try {
        return await storage.increment(key, ttl);
      } catch (error) {
        warnSecondaryStorageError("increment", error);
        throw error;
      }
    },
    async listKeys() {
      try {
        return await storage.listKeys();
      } catch (error) {
        warnSecondaryStorageError("listKeys", error);
        return [];
      }
    },
    async set(key, value, ttl) {
      try {
        await storage.set(key, value, ttl);
      } catch (error) {
        warnSecondaryStorageError("set", error);
      }
    },
  };
}

/** Better Auth secondary storage backed by the process-scoped Redis singleton. */
export function createBetterAuthSecondaryStorage(): RedisSecondaryStorage {
  let storage: RedisSecondaryStorage | null = null;

  function getStorage(): RedisSecondaryStorage {
    if (!storage) {
      const client = requireRedisCommands();
      storage = wrapWithResilience(
        redisStorage({
          client,
          keyPrefix: BETTER_AUTH_REDIS_KEY_PREFIX,
        }),
      );
    }
    return storage;
  }

  return {
    clear() {
      return getStorage().clear();
    },
    delete(key) {
      return getStorage().delete(key);
    },
    get(key) {
      return getStorage().get(key);
    },
    getAndDelete(key) {
      return getStorage().getAndDelete(key);
    },
    increment(key, ttl) {
      return getStorage().increment(key, ttl);
    },
    listKeys() {
      return getStorage().listKeys();
    },
    set(key, value, ttl) {
      return getStorage().set(key, value, ttl);
    },
  };
}
