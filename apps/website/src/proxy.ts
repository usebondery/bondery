import { type NextRequest, NextResponse, type ProxyConfig } from "next/server";

function getPlausibleCspOrigin(): string {
  const host = process.env.BONDERY_PUBLIC_PLAUSIBLE_HOST?.trim();
  if (host) {
    try {
      return new URL(host).origin;
    } catch {
      // Fall through to production default.
    }
  }
  return "https://plausible.usebondery.com";
}

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";
  const plausibleOrigin = getPlausibleCspOrigin();

  /**
   * `require-trusted-types-for 'script'` is omitted. React hydration sets
   * `innerHTML` and `script.src` with plain strings, so the directive stops
   * the client render and leaves an empty body. No Trusted Types policy exists
   * in the website today. Add the directive again only together with a policy.
   *
   * `style-src` needs `'unsafe-inline'`. Mantine writes 261 inline `style`
   * attributes, and the server sends 30 `<style>` tags without a nonce, so a
   * nonce-only rule drops every page style.
   *
   * `script-src` keeps the nonce with `'strict-dynamic'`. That is the rule that
   * stops injected scripts, and it works today.
   */
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${plausibleOrigin}${isDev ? " 'unsafe-eval'" : ""};
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https://icons.duckduckgo.com;
    font-src 'self';
    connect-src 'self' https://api.github.com ${plausibleOrigin};
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `;

  const contentSecurityPolicyHeaderValue = cspHeader.replace(/\s{2,}/g, " ").trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicyHeaderValue);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set("Content-Security-Policy", contentSecurityPolicyHeaderValue);

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
