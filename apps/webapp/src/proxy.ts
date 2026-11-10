import type { NextRequest, ProxyConfig } from "next/server";
import { REQUEST_SEARCH_HEADER } from "@/lib/auth/constants";
import { updateSession } from "@/lib/auth/proxy";
import { buildWebappProxyHeaders } from "@/lib/security/proxyHeaders";

/**
 * Refreshes the BFF session and stamps the security headers on the response.
 *
 * `updateSession` owns the cookie refresh and the benign redirects. The headers
 * are applied to whatever response it returns, so the session logic stays
 * untouched.
 *
 * `require-trusted-types-for` is deliberately absent from the enforced policy
 * and always present in the report-only one. A browser enforces it from either
 * header, and the app satisfies it, so there is nothing to promote. Do not
 * register a `default` Trusted Types policy: measured on `/login`, one breaks
 * Next's head manager with `Cannot read properties of null (reading
 * 'cloneNode')`, while no policy renders clean. See
 * `references/headers-csp-and-cors.md`.
 */
export async function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  requestHeaders.set(REQUEST_SEARCH_HEADER, request.nextUrl.search);

  const { csp, headers, nonce } = buildWebappProxyHeaders();
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = await updateSession(request, requestHeaders);

  for (const [name, value] of Object.entries(headers)) {
    response.headers.set(name, value);
  }

  return response;
}

/**
 * Next.js reads a `config` export, not `proxyConfig`. The wrong name is
 * silently ignored: the matcher falls back to `.*`, the proxy runs on
 * `_next/static` too, and no header reaches the page.
 */
export const config: ProxyConfig = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
