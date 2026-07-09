import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { bffProxyFetch } from "@/lib/api/bffProxy";
import { resolveServerSession } from "@/lib/auth/resolveServerSession";

export async function POST(request: Request) {
  const session = await resolveServerSession();

  if (session.status !== "ok") {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json();

  const apiResponse = await bffProxyFetch(API_ROUTES.CHAT, {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  return new Response(apiResponse.body, {
    headers: {
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Content-Type": apiResponse.headers.get("Content-Type") ?? "text/event-stream",
      "x-vercel-ai-ui-message-stream":
        apiResponse.headers.get("x-vercel-ai-ui-message-stream") ?? "v1",
    },
    status: apiResponse.status,
  });
}
