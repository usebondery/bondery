import { API_ROUTES, IDEMPOTENCY_KEY_HEADER } from "@bondery/helpers/globals/paths";
import type { NextRequest } from "next/server";
import { bffProxyFetch } from "@/lib/api/bffProxy";
import { resolveServerSession } from "@/lib/auth/resolveServerSession";

/**
 * Proxy handler that forwards chat session API requests to the Fastify backend.
 */
async function proxyRequest(request: NextRequest, subPath: string) {
  const session = await resolveServerSession();

  if (session.status !== "ok") {
    return new Response("Unauthorized", { status: 401 });
  }

  const headers = new Headers();
  const contentType = request.headers.get("Content-Type");
  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  const idempotencyKey = request.headers.get(IDEMPOTENCY_KEY_HEADER);
  if (idempotencyKey) {
    headers.set(IDEMPOTENCY_KEY_HEADER, idempotencyKey);
  }

  const fetchOptions: RequestInit = {
    headers,
    method: request.method,
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    const body = await request.arrayBuffer();
    if (body.byteLength > 0) {
      fetchOptions.body = body;
    }
  }

  const apiResponse = await bffProxyFetch(`${API_ROUTES.CHAT_SESSIONS}${subPath}`, fetchOptions);

  // Fetch throws if a 204/205/304 Response is constructed with a body. Fastify may
  // still emit `"null"` for `{ type: "null" }` schemas — drop it here.
  const responseHeaders = new Headers();
  for (const name of ["Idempotent-Replayed", "RateLimit", "RateLimit-Policy", "Retry-After"]) {
    const value = apiResponse.headers.get(name);
    if (value) {
      responseHeaders.set(name, value);
    }
  }

  if (apiResponse.status === 204) {
    void apiResponse.body?.cancel();
    return new Response(null, { headers: responseHeaders, status: 204 });
  }

  const responseBody = await apiResponse.text();
  responseHeaders.set(
    "Content-Type",
    apiResponse.headers.get("Content-Type") ?? "application/json",
  );

  return new Response(responseBody, {
    headers: responseHeaders,
    status: apiResponse.status,
  });
}

function getSubPath(params: { path?: string[] }): string {
  return params.path ? `/${params.path.join("/")}` : "";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  return proxyRequest(request, getSubPath(await params));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  return proxyRequest(request, getSubPath(await params));
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  return proxyRequest(request, getSubPath(await params));
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  return proxyRequest(request, getSubPath(await params));
}
