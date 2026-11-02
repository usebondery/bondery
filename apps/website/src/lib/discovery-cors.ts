/**
 * CORS for public discovery documents: the MCP Server Card and the ARD catalog.
 *
 * Both carry only public metadata and are read-only, so `*` is safe and required —
 * browser-based agents fetch them cross-origin. See the MCP Server Cards extension
 * discovery spec ("CORS Requirements") and the ARD publishing guide.
 */
const DISCOVERY_CORS_HEADERS = {
  "Access-Control-Allow-Headers": "Content-Type, If-None-Match",
  "Access-Control-Allow-Methods": "GET",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Expose-Headers": "ETag",
} as const;

/** Merge discovery CORS headers into a route handler's response headers. */
export function withDiscoveryCors(headers: Record<string, string>): Record<string, string> {
  return { ...headers, ...DISCOVERY_CORS_HEADERS };
}

/** Answer a cross-origin preflight for a discovery document. */
export function discoveryCorsPreflight(): Response {
  return new Response(null, {
    headers: DISCOVERY_CORS_HEADERS,
    status: 204,
  });
}
