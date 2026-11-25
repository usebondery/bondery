import type { PrismaClient } from "@bondery/db";
import type { ApiErrorCode, ApiErrorType } from "@bondery/schemas/errors";
import type { FastifyBaseLogger } from "fastify";

export interface DomainAuthUser {
  email: string;
  id: string;
}

export interface DomainContext {
  /** Primary data access — set by `domainContextFromRequest`. */
  db?: PrismaClient;
  log?: FastifyBaseLogger;
  /** Fastify `request.id` (or a generated fallback on MCP/chat). */
  requestId?: string;
  user: DomainAuthUser;
  wakeMeta?: {
    sourceDeviceId?: string;
  };
}

export class DomainError extends Error {
  readonly statusCode: number;
  readonly code: ApiErrorCode;
  override readonly cause?: unknown;
  readonly details?: Record<string, unknown>;
  readonly type?: ApiErrorType;
  readonly param?: string;

  constructor(
    message: string,
    statusCode: number,
    code: ApiErrorCode,
    options: {
      cause?: unknown;
      details?: Record<string, unknown>;
      param?: string;
      type?: ApiErrorType;
    } = {},
  ) {
    super(message);
    this.name = "DomainError";
    this.statusCode = statusCode;
    this.code = code;
    this.cause = options.cause;
    this.details = options.details;
    this.type = options.type;
    this.param = options.param;
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
