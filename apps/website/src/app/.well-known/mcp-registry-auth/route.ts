import { BONDERY_MCP_REGISTRY_AUTH_PROOF } from "@bondery/helpers";

/** Official MCP Registry HTTP namespace proof. Must be 200 text/plain with no redirect. */
export function GET() {
  return new Response(`${BONDERY_MCP_REGISTRY_AUTH_PROOF}\n`, {
    headers: {
      "Cache-Control": "max-age=86400",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
