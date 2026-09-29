-- Better Auth MCP + CIMD: expand-only OAuth client provenance columns
-- (clientDiscoveryId / clientCredentialsScopes / applicationType from
-- getAuthTables after swapping oauthProvider() for mcp()+cimd()) and the
-- load-bearing unique on oauth_client_resource (clientId, resourceId).
--
-- Nothing is dropped or renamed. Rollback to a pre-MCP API build keeps
-- working against this schema (older code never reads the new columns).

ALTER TABLE "oauth_client" ADD COLUMN IF NOT EXISTS "client_discovery_id" TEXT;
ALTER TABLE "oauth_client" ADD COLUMN IF NOT EXISTS "client_credentials_scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "oauth_client" ADD COLUMN IF NOT EXISTS "application_type" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "oauth_client_resource_client_id_resource_id_key"
  ON "oauth_client_resource"("client_id", "resource_id");
