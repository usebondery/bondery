import { API_ROUTES } from "@bondery/helpers/globals/paths";
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

  const fetchOptions: RequestInit = {
    headers: { "Content-Type": "application/json" },
    method: request.method,
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    try {
      fetchOptions.body = JSON.stringify(await request.json());
    } catch {
      // No body — that's fine for DELETE
    }
  }

  const apiResponse = await bffProxyFetch(`${API_ROUTES.CHAT_SESSIONS}${subPath}`, fetchOptions);
  const responseBody = await apiResponse.text();

  return new Response(responseBody, {
    headers: { "Content-Type": apiResponse.headers.get("Content-Type") ?? "application/json" },
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
