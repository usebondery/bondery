import { API_KEY_LIMITS } from "@bondery/schemas";
import { type DomainContext, DomainError } from "../../domains/_shared/context.js";
import {
  formatApiKeyPrefix,
  generateApiKeyMaterial,
  hashApiKey,
} from "../../lib/platform/auth/api-keys.js";
import { internal } from "../../lib/platform/errors/http-errors.js";

function mapApiKeyRow(row: {
  id: string;
  label: string;
  permission: string;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string;
}) {
  return {
    createdAt: row.created_at,
    id: row.id,
    keyPrefix: row.key_prefix,
    label: row.label,
    lastUsedAt: row.last_used_at,
    permission: row.permission === "read" ? ("read" as const) : ("full" as const),
  };
}

export async function createApiKey(
  ctx: DomainContext,
  input: { label: string; permission: "read" | "full" },
  pepper: string,
) {
  const { client, user } = ctx;

  const { count, error: countError } = await client
    .from("api_keys")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (countError) {
    throw internal("api_key_failed", countError.message);
  }

  if ((count ?? 0) >= API_KEY_LIMITS.maxPerUser) {
    throw new DomainError(
      `Maximum of ${API_KEY_LIMITS.maxPerUser} API keys per account`,
      409,
      "api_key_limit_exceeded",
    );
  }

  const { keyId, secret, fullKey } = generateApiKeyMaterial();
  const keyHash = hashApiKey(fullKey, pepper);
  const keyPrefix = formatApiKeyPrefix(keyId, secret);

  const { data, error } = await client
    .from("api_keys")
    .insert({
      key_hash: keyHash,
      key_id: keyId,
      key_prefix: keyPrefix,
      label: input.label.trim(),
      permission: input.permission,
      user_id: user.id,
    })
    .select("id, label, permission, key_prefix, last_used_at, created_at")
    .single();

  if (error || !data) {
    throw internal("api_key_failed", error?.message ?? "Failed to create API key");
  }

  return {
    ...mapApiKeyRow(data),
    secret: fullKey,
  };
}

export async function updateApiKeyLabel(ctx: DomainContext, apiKeyId: string, label: string) {
  const { client, user } = ctx;

  const { data, error } = await client
    .from("api_keys")
    .update({ label: label.trim() })
    .eq("id", apiKeyId)
    .eq("user_id", user.id)
    .select("id, label, permission, key_prefix, last_used_at, created_at")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new DomainError("API key not found", 404, "api_key_not_found");
    }
    throw internal("api_key_failed", error.message);
  }

  return mapApiKeyRow(data);
}

export async function deleteApiKey(ctx: DomainContext, apiKeyId: string): Promise<void> {
  const { client, user } = ctx;

  const { data, error } = await client
    .from("api_keys")
    .delete()
    .eq("id", apiKeyId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    throw internal("api_key_failed", error.message);
  }

  if (!data) {
    throw new DomainError("API key not found", 404, "api_key_not_found");
  }
}
