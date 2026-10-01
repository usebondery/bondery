/**
 * HTTP proof for official MCP Registry namespace `com.usebondery/*`.
 * Served at `https://usebondery.com/.well-known/mcp-registry-auth` (200 text/plain, no redirect).
 * Rotate with a new Ed25519 key; update Infisical `BONDERY_OPS_MCP_REGISTRY_PRIVATE_KEY`.
 */
export const BONDERY_MCP_REGISTRY_AUTH_PROOF =
  "v=MCPv1; k=ed25519; p=Q8fni6hN3hCApCqad5I8olw9latFkfL0OGnhEjHcdMI=";
