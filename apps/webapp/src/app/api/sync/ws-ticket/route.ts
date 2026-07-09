import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { bffProxyFetch } from "@/lib/api/bffProxy";
import { buildNestedErrorResponse } from "@/lib/api/buildNestedErrorResponse";
import { resolveServerSession } from "@/lib/auth/resolveServerSession";

export async function GET() {
  const session = await resolveServerSession();

  if (session.status !== "ok") {
    return buildNestedErrorResponse({
      code: "auth_required",
      message: "Unauthorized - Please log in",
      status: 401,
    });
  }

  const apiResponse = await bffProxyFetch(API_ROUTES.SYNC_WS_TICKET, { method: "GET" });
  const responseContentType = apiResponse.headers.get("Content-Type");
  const body = await apiResponse.text();

  return new Response(body, {
    headers: responseContentType ? { "Content-Type": responseContentType } : undefined,
    status: apiResponse.status,
  });
}
