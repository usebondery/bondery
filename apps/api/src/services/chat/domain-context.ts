import type { Database } from "@bondery/schemas/supabase.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DomainError } from "../../domains/_shared/context.js";
import { domainContextFromClient } from "../../lib/platform/domain-context.js";

export function chatDomainContext(supabase: SupabaseClient<Database>, userId: string) {
  return domainContextFromClient(supabase, { email: "", id: userId });
}

export function formatToolDomainError(error: unknown, fallback: string): { error: string } {
  if (error instanceof DomainError) {
    return { error: error.message };
  }
  if (error instanceof Error) {
    return { error: error.message };
  }
  return { error: fallback };
}
