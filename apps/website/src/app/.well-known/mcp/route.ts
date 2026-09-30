import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { permanentRedirect } from "next/navigation";
import { apiUrl } from "@/lib/api-url";

/** Convenience pointer — not MCP spec and not RFC 8414. OAuth JSON stays on the API. */
export function GET() {
  permanentRedirect(apiUrl(API_ROUTES.MCP));
}
