import { resolveServerSession } from "@/lib/auth/resolveServerSession";
import { bffProxyFetch } from "@/lib/api/bffProxy";
import { API_ROUTES } from "@bondery/helpers/globals/paths";

export async function POST(request: Request) {
  const session = await resolveServerSession();

  if (session.status !== "ok") {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json();

  const apiResponse = await bffProxyFetch(API_ROUTES.CHAT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return new Response(apiResponse.body, {
    status: apiResponse.status,
    headers: {
      "Content-Type": apiResponse.headers.get("Content-Type") ?? "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "x-vercel-ai-ui-message-stream":
        apiResponse.headers.get("x-vercel-ai-ui-message-stream") ?? "v1",
    },
  });
}
