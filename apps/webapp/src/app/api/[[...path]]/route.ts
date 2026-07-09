import type { NextRequest } from "next/server";
import { bffProxyFetch } from "@/lib/api/bffProxy";
import { buildNestedErrorResponse } from "@/lib/api/buildNestedErrorResponse";
import { resolveServerSession } from "@/lib/auth/resolveServerSession";

type RouteContext = { params: Promise<{ path?: string[] }> };

/**
 * Proxies browser `/api/*` requests to the Fastify backend with a validated
 * Bearer token — the same auth path used by server components and chat routes.
 */
async function proxyToApi(request: NextRequest, pathSegments: string[]) {
  const session = await resolveServerSession();

  if (session.status !== "ok") {
    return buildNestedErrorResponse({
      code: "auth_required",
      message: "Unauthorized - Please log in",
      status: 401,
    });
  }

  const path = pathSegments.length > 0 ? `/${pathSegments.join("/")}` : "";
  const apiPath = `/api${path}${request.nextUrl.search}`;

  const headers = new Headers();

  const contentType = request.headers.get("Content-Type");
  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  const extensionVersion = request.headers.get("X-Bondery-Extension-Version");
  if (extensionVersion) {
    headers.set("X-Bondery-Extension-Version", extensionVersion);
  }

  const init: RequestInit = {
    headers,
    method: request.method,
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    const body = await request.arrayBuffer();
    if (body.byteLength > 0) {
      init.body = body;
    }
  }

  const apiResponse = await bffProxyFetch(apiPath, init);

  const responseHeaders = new Headers();
  const responseContentType = apiResponse.headers.get("Content-Type");
  if (responseContentType) {
    responseHeaders.set("Content-Type", responseContentType);
  }

  for (const name of ["Cache-Control", "Connection", "x-vercel-ai-ui-message-stream"]) {
    const value = apiResponse.headers.get(name);
    if (value) {
      responseHeaders.set(name, value);
    }
  }

  return new Response(apiResponse.body, {
    headers: responseHeaders,
    status: apiResponse.status,
  });
}

function getPathSegments(params: { path?: string[] }): string[] {
  return params.path ?? [];
}

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyToApi(request, getPathSegments(await context.params));
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyToApi(request, getPathSegments(await context.params));
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return proxyToApi(request, getPathSegments(await context.params));
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxyToApi(request, getPathSegments(await context.params));
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxyToApi(request, getPathSegments(await context.params));
}
