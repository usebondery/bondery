import { buildSecurityHeaders } from "@bondery/helpers/security";
import { type NextRequest, NextResponse, type ProxyConfig } from "next/server";
import { buildWebsiteCsp } from "@/lib/security/websiteCsp";

/**
 * Attaches the security headers and forwards the nonce to the server render.
 *
 * The policy lives in `lib/security/websiteCsp.ts` and is built by the shared
 * `@bondery/helpers/security` builder. Do not hand-write a directive here.
 */
export function proxy(request: NextRequest) {
  const { csp, nonce, reportOnlyCsp, reportEndpoint } = buildWebsiteCsp();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  for (const [name, value] of Object.entries(
    buildSecurityHeaders({ csp, reportEndpoint, reportOnlyCsp }),
  )) {
    response.headers.set(name, value);
  }

  return response;
}

/**
 * Next.js reads a `config` export, not `proxyConfig`. The wrong name is
 * silently ignored, which left every route unmatched and dropped the CSP.
 */
export const config: ProxyConfig = {
  matcher: [
    {
      missing: [
        { key: "next-router-prefetch", type: "header" },
        { key: "purpose", type: "header", value: "prefetch" },
      ],
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
    },
  ],
};
