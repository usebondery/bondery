import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthHeaders } from "@/lib/authHeaders";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { API_URL } from "@/lib/config";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json();
  const headers = await getAuthHeaders();

  const apiResponse = await fetch(`${API_URL}${API_ROUTES.CHAT}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
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
