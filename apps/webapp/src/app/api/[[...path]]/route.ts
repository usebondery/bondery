import { resolveServerSession } from "@/lib/auth/resolveServerSession";
import { serverApiFetch } from "@/lib/api/server";
import { NextRequest } from "next/server";

type RouteContext = { params: Promise<{ path?: string[] }> };

/**
 * Proxies browser `/api/*` requests to the Fastify backend with a validated
 * Bearer token — the same auth path used by server components and chat routes.
 */
async function proxyToApi(request: NextRequest, pathSegments: string[]) {
  const session = await resolveServerSession();

  if (session.status !== "ok") {
    return Response.json({ error: "Unauthorized - Please log in", code: "BFF_UNAUTHORIZED" }, { status: 401 });
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
    method: request.method,
    headers,
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    const body = await request.arrayBuffer();
    if (body.byteLength > 0) {
      init.body = body;
    }
  }

  const apiResponse = await serverApiFetch(apiPath, init);

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
    status: apiResponse.status,
    headers: responseHeaders,
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
