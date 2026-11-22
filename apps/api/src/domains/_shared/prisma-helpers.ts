import { Prisma } from "@bondery/db";
import type { Group, Tag } from "@bondery/schemas";

function isPlainObject(value: object): value is Record<string, unknown> {
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export function isForeignKeyViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003";
}

export function isCheckViolation(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return (
      error.code === "P2004" ||
      (typeof error.message === "string" && error.message.includes("23514"))
    );
  }
  return false;
}

export function toIso(value: Date | string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return value instanceof Date ? value.toISOString() : value;
}

export function toGroupDto(row: {
  id: string;
  userId: string;
  label: string;
  emoji: string | null;
  color: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Group {
  return {
    color: row.color,
    createdAt: row.createdAt.toISOString(),
    emoji: row.emoji,
    id: row.id,
    label: row.label,
    updatedAt: row.updatedAt.toISOString(),
    userId: row.userId,
  };
}

export function toTagDto(row: {
  id: string;
  userId: string;
  label: string;
  color: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Tag {
  return {
    color: row.color,
    createdAt: row.createdAt.toISOString(),
    id: row.id,
    label: row.label,
    updatedAt: row.updatedAt.toISOString(),
    userId: row.userId,
  };
}

/** Drop Prisma Unsupported / Buffer values that cannot be stored in JSONB. */
export function toJsonSafe(value: unknown): unknown {
  if (value === null || value === undefined) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(toJsonSafe);
  }
  if (typeof value === "object" && isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      out[key] = toJsonSafe(nested);
    }
    return out;
  }
  return null;
}

/** Prisma model row → snake_case sync payload. */
export function toSyncRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    out[snakeKey] = toJsonSafe(value);
  }
  return out;
}

export function toPeopleTagSyncRow(row: {
  id: string;
  userId: string;
  personId: string;
  tagId: string;
  createdAt: Date;
}): Record<string, unknown> {
  return {
    created_at: row.createdAt.toISOString(),
    id: row.id,
    person_id: row.personId,
    tag_id: row.tagId,
    user_id: row.userId,
  };
}

export function toPeopleGroupSyncRow(row: {
  id: string;
  userId: string;
  personId: string;
  groupId: string;
  createdAt: Date;
}): Record<string, unknown> {
  return {
    created_at: row.createdAt.toISOString(),
    group_id: row.groupId,
    id: row.id,
    person_id: row.personId,
    user_id: row.userId,
  };
}
