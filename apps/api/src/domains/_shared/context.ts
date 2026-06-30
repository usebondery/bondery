import type { SupabaseClient } from "@supabase/supabase-js";
import type { FastifyBaseLogger } from "fastify";
import type { Database } from "@bondery/schemas/database";

export type DomainSupabaseClient = SupabaseClient<Database>;

export interface DomainAuthUser {
  id: string;
  email: string;
}

export interface DomainContext {
  client: DomainSupabaseClient;
  user: DomainAuthUser;
  log?: FastifyBaseLogger;
}

export class DomainError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 400,
    readonly code?: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export function assertDomain(condition: unknown, message: string, statusCode = 400): asserts condition {
  if (!condition) {
    throw new DomainError(message, statusCode);
  }
}
