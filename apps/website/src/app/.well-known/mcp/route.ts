import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { apiUrl } from "@/lib/api-url";
import { permanentRedirectExternal } from "@/lib/navigation/redirect/external";

/** Convenience pointer — not MCP spec and not RFC 8414. OAuth JSON stays on the API. */
export function GET() {
  permanentRedirectExternal(apiUrl(API_ROUTES.MCP));
}
