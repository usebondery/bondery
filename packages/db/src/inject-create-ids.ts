import { generateId } from "@bondery/helpers/ids";

const RELATION_KEYS = new Set([
  "connect",
  "connectOrCreate",
  "disconnect",
  "delete",
  "deleteMany",
  "set",
  "update",
  "updateMany",
]);

/**
 * True for rows of a model that has no `id` column, recognised by their fields. Prisma
 * rejects an unknown `id`, so every such model that is written through `create`,
 * `createMany` or `upsert` needs a rule here.
 */
function usesCompositePrimaryKey(record: Record<string, unknown>): boolean {
  // StripeWebhookEvent: keyed by `eventId`.
  if ("eventId" in record && "eventType" in record) {
    return true;
  }
  if ("interactionId" in record && "personId" in record) {
    return true;
  }
  if ("userId" in record && "clientMutationId" in record) {
    return true;
  }
  if ("serverSequence" in record) {
    return true;
  }
  if ("userId" in record && "lastSequence" in record && Object.keys(record).length === 2) {
    return true;
  }
  if ("stripeSubscriptionId" in record && "email" in record && !("userId" in record)) {
    return true;
  }
  // CarddavCardVersion: keyed by (cardId, etag).
  if ("cardId" in record && "etag" in record) {
    return true;
  }
  // PeopleVcardExtras: keyed by personId.
  if ("personId" in record && "properties" in record) {
    return true;
  }
  return false;
}

function shouldInjectId(record: Record<string, unknown>): boolean {
  if (record["id"] !== undefined && record["id"] !== null) {
    return false;
  }
  if (usesCompositePrimaryKey(record)) {
    return false;
  }

  const scalarKeys = Object.keys(record).filter(
    (key) => key !== "create" && key !== "createMany" && !RELATION_KEYS.has(key),
  );
  return scalarKeys.length > 0;
}

function injectNestedRelationWrite(value: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, nestedValue] of Object.entries(value)) {
    if (key === "create" || key === "createMany") {
      result[key] = processRelationWrite(nestedValue, key);
      continue;
    }
    result[key] = nestedValue;
  }

  return result;
}

function processRelationWrite(value: unknown, key: "create" | "createMany"): unknown {
  if (key === "createMany" && value && typeof value === "object" && !Array.isArray(value)) {
    const createMany = value as Record<string, unknown>;
    return {
      ...createMany,
      data: injectCreateIds(createMany["data"]),
    };
  }

  return injectCreateIds(value);
}

export function injectCreateIds<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((row) => injectCreateIds(row)) as T;
  }
  if (typeof data !== "object") {
    return data;
  }

  const record = data as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    if (key === "create" || key === "createMany") {
      result[key] = processRelationWrite(value, key);
      continue;
    }
    if (RELATION_KEYS.has(key)) {
      result[key] = value;
      continue;
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const nested = value as Record<string, unknown>;
      if ("create" in nested || "createMany" in nested) {
        result[key] = injectNestedRelationWrite(nested);
        continue;
      }
    }
    result[key] = value;
  }

  if (shouldInjectId(result)) {
    result["id"] = generateId();
  }

  return result as T;
}
