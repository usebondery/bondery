import type { Database } from "@bondery/schemas/database";
import type { ApiErrorCode, ApiErrorType } from "@bondery/schemas/errors";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FastifyBaseLogger } from "fastify";

export type DomainSupabaseClient = SupabaseClient<Database>;

export interface DomainAuthUser {
  email: string;
  id: string;
}

export interface DomainContext {
  client: DomainSupabaseClient;
  log?: FastifyBaseLogger;
  user: DomainAuthUser;
  wakeMeta?: {
    sourceDeviceId?: string;
  };
}

export class DomainError extends Error {
  readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    readonly statusCode: number,
    readonly code: ApiErrorCode,
    readonly cause?: unknown,
    details?: Record<string, unknown>,
    readonly type?: ApiErrorType,
    readonly param?: string,
  ) {
    super(message);
    this.name = "DomainError";
    this.details = details;
  }
}

export function assertDomain(
  condition: unknown,
  message: string,
  statusCode = 400,
  code: ApiErrorCode = "bad_request",
): asserts condition {
  if (!condition) {
    throw new DomainError(message, statusCode, code);
  }
}

export function syncEmitMetaFromContext(ctx: DomainContext) {
  return ctx.wakeMeta?.sourceDeviceId ? { sourceDeviceId: ctx.wakeMeta.sourceDeviceId } : undefined;
}
