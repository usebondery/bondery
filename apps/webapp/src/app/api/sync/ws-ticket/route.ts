import { resolveServerSession } from "@/lib/auth/resolveServerSession";
import { bffProxyFetch } from "@/lib/api/bffProxy";
import { API_ROUTES } from "@bondery/helpers/globals/paths";

export async function GET() {
  const session = await resolveServerSession();

  if (session.status !== "ok") {
    return Response.json({ error: "Unauthorized - Please log in", code: "BFF_UNAUTHORIZED" }, { status: 401 });
  }

  const apiResponse = await bffProxyFetch(API_ROUTES.SYNC_WS_TICKET, { method: "GET" });
  const responseContentType = apiResponse.headers.get("Content-Type");
  const body = await apiResponse.text();

  return new Response(body, {
    status: apiResponse.status,
    headers: responseContentType ? { "Content-Type": responseContentType } : undefined,
  });
}
