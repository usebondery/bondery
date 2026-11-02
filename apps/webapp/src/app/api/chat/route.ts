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
    // Stop aborts the browser fetch. Forward it so the API stops the model.
    signal: request.signal,
  });

  const headers = new Headers();
  const contentType = apiResponse.headers.get("Content-Type");
  if (contentType) {
    headers.set("Content-Type", contentType);
  }
  for (const name of ["Cache-Control", "Connection", "x-vercel-ai-ui-message-stream"]) {
    const value = apiResponse.headers.get(name);
    if (value) {
      headers.set(name, value);
    }
  }

  return new Response(apiResponse.body, {
    headers,
    status: apiResponse.status,
  });
}
