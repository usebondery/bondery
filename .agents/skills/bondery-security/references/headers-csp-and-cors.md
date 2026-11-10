# Headers, CSP, and CORS

Authoritative record for security headers, Content-Security-Policy, Trusted
Types, and CORS.

Sources used in this file:

- OWASP CSP Cheat Sheet —
  <https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html>
- MDN CSP guide — <https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP>
- MDN Trusted Types — <https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API>

Which principle came from which source:

| Principle | Source |
|---|---|
| A nonce with `'strict-dynamic'` protects script loading. | OWASP CSP Cheat Sheet |
| `frame-ancestors` supersedes `X-Frame-Options`. | MDN CSP guide |
| A report-only policy collects violations before enforcement. | MDN CSP guide |
| Trusted Types turns DOM XSS sinks into TypeErrors. | MDN Trusted Types |

## The rule

Every `Content-Security-Policy` value comes from one builder:
`@bondery/helpers/security` (`packages/helpers/src/security/`).

No app writes a policy string. `pnpm run check:security-headers` fails the build
when a proxy hand-writes directives, exports the wrong config name, or puts
`'unsafe-inline'` in `script-src`.

The builder is pure and uses Web Crypto only. `proxy.ts` can run on the Edge
runtime, so `node:crypto` and `Buffer` are not available there.

## Header matrix

| Surface | `Content-Security-Policy` | Report-Only | `X-Content-Type-Options` | `Referrer-Policy` | `Permissions-Policy` | COOP | HSTS |
|---|---|---|---|---|---|---|---|
| Website (`apps/website/src/proxy.ts`) | Enforced, nonce + `strict-dynamic` | Yes, adds Trusted Types | `nosniff` | `strict-origin-when-cross-origin` | From the builder | `same-origin` | `next.config.ts` |
| Webapp (`apps/webapp/src/proxy.ts`) | Enforced, nonce + `strict-dynamic` | Yes, adds Trusted Types | `nosniff` | `strict-origin-when-cross-origin` | From the builder | `same-origin` | `next.config.ts` |
| API (`apps/api/src/build-app.ts`) | Disabled on purpose | — | Helmet default | Helmet default | `onSend` hook, shared constant | Disabled | Production only |

The API serves JSON, so a policy adds no protection there. That is a known-safe
pattern, not a gap. Helmet has no option for `Permissions-Policy`, so the API
sets it from an `onSend` hook using the same `PERMISSIONS_POLICY` constant the
builder uses. All three surfaces therefore deny the same features.

## Framing: one owner per path

`frame-ancestors 'none'` decides framing, and it supersedes `X-Frame-Options`
(MDN CSP guide). Two sources for one decision drift apart, so the split follows
the proxy matcher:

| Path | Framing source |
|---|---|
| Matched by `proxy.ts` | `frame-ancestors 'none'` in the policy. No `X-Frame-Options`. |
| Excluded by the matcher (`/api`, `_next/static`, `_next/image`, `favicon.ico`, static images) | `X-Frame-Options: DENY` from `next.config.ts` `headers()` |

The excluded paths never reach the proxy, so they would otherwise have no
framing protection at all. `next.config.ts` declares XFO only for those four or
five sources; the builder never writes XFO. Verify with
`curl -sSI <host>/` (CSP, no XFO) and `curl -sSI <host>/favicon.ico` (XFO, no
CSP).

## The builder

`buildCsp(input)` returns one policy string. `buildSecurityHeaders(input)` turns
the policies into a header record.

```ts
buildCsp({
  nonce,
  variant: "enforced",       // or "report-only"
  connectSrc: ["https://api.example.com"],
  imgSrc: ["https://tiles.example.com"],
  scriptSrc: ["https://plausible.example.com"],
  isDev: process.env.NODE_ENV === "development",
  reportEndpoint: "https://api.example.com/security/csp-report",
  trustedTypes: WEBAPP_TRUSTED_TYPES_POLICIES, // report-only only
});
```

Both variants come from the same function, so they cannot drift. The
`report-only` variant changes exactly three things:

1. `style-src` drops `'unsafe-inline'` and keeps the nonce.
2. `base-uri` becomes `'none'`.
3. `require-trusted-types-for` and `trusted-types` appear when the caller lists
   policy names. Both apps always pass `nextjs`, which is Next's own policy. Do
   not add a Bondery policy name; see the Trusted Types section for the measured
   failure that causes.

`headers.ts` omits a header whose input is absent. A self-host install with no
report collector therefore sends no `Reporting-Endpoints` header and no
`report-to` directive.

### Why `style-src` keeps `'unsafe-inline'`

Mantine writes inline `style` attributes and the server emits `<style>` tags
without a nonce. A nonce-only `style-src` drops every page style. The report-only
policy carries the nonce-only rule so the violation volume is measured before
enforcement.

### Why `script-src` never has `'unsafe-inline'`

`'unsafe-inline'` disables the nonce, so any injected inline script runs. The
nonce plus `'strict-dynamic'` is the rule that stops it (OWASP CSP Cheat Sheet).

## The `proxyConfig` bug

Next.js reads `export const config` from `proxy.ts`. A file that exports
`proxyConfig` looks correct and is silently ignored:

- The matcher falls back to `.*`, so the proxy runs on `_next/static` too.
- No policy header reaches the page.

The website shipped with that bug and sent no CSP at all. To prevent a repeat:

- Every proxy exports `config`.
- `pnpm run check:security-headers` fails on `proxyConfig`.
- `apps/webapp/src/lib/security/proxy.test.ts` and
  `apps/website/src/lib/security/proxy.test.ts` call the real `proxy` export and
  assert the emitted header.

## Trusted Types

### Decision

Trusted Types is REPORT-ONLY and always on, with no registered policy. It never
appears in the enforced policy.

### Why report-only, and why no policy

The website shipped the directive in the enforced policy once. It aborted React
hydration and left an empty body, because React assigns `innerHTML` and
`script.src` with plain strings.

A browser also enforces `require-trusted-types-for` when the directive arrives in
the `Content-Security-Policy-Report-Only` header. It is not a passive observer
for this directive. That is acceptable, because the app satisfies it as long as
nothing registers a Trusted Types policy.

**Do not register a `default` (or any) Trusted Types policy.** Measured on the
webapp `/login` route:

| Setup | Result |
|---|---|
| Directive present, `bondery#default` + `default` registered | Runtime error dialog: `Cannot read properties of null (reading 'cloneNode')` |
| Directive present, no policy registered | Clean render. `new Function`, `script.text`, `script.src`, `innerHTML` all succeed |

The failure is in `next/dist/client/head-manager.js`. Its `isEqualNode` clones a
tag and reads `cloneTag.nonce`. A registered policy affects how that clone
behaves, and the read throws. Trusted Types already provides its own internal
default handling, so registering one is unnecessary as well as harmful.

Consequence: no `dompurify` dependency, and no `BONDERY_PUBLIC_CSP_TRUSTED_TYPES`
flag. Both were removed after this measurement.

### Sink audit

| Sink | Where | Under the directive |
|---|---|---|
| `innerHTML` | React hydration, TipTap | Succeeds |
| `script.src` | Next.js chunk loader, Stripe, PostHog | Succeeds |
| `script.text` | React Compiler | Succeeds |
| `cloneNode` nonce read | Next head manager | Succeeds when no policy is registered |

### How to verify after a change

Start the webapp dev server, then load `/login` in a browser and assert three
things: the page renders its heading, no error dialog appears, and the dev log
shows no `[browser]` error line. A render error means a policy was registered or
a new sink needs attention.

## Reporting pipeline

```
browser violation
  → Content-Security-Policy-Report-Only (or enforced)
  → POST /security/csp-report  (API)
  → compaction (lib/platform/security/csp-report.ts)
  → PostHog event security:csp_violation
```

The endpoint (`apps/api/src/routes/security/csp-report.ts`):

- Accepts `application/csp-report` and `application/reports+json`.
- Body cap 16 KiB, well under the 64 KiB Fastify default.
- No authentication, because a browser cannot send a secret. Mounted with
  `openApiAreaRoutes("internal", ...)`, never `internalRoutes`: the latter
  requires a service-role bearer token.
- Rate limited by `CSP_REPORT_TIER` (60 per minute per client).
- Returns `204` and never echoes the body.

Compaction keeps `effectiveDirective`, `disposition`, the document pathname, the
blocked origin plus pathname, `sourceFile`, and `lineNumber`. It drops `sample`
and every query string, because a query can carry user content.

PostHog receives one event per report, keyed on `csp-report:<host>`. The
per-user opt-out path in `posthog-capture.ts` is not called: it needs a
`DomainContext`, and a CSP report has no authenticated user.

### The endpoint is derived, not configured

Do not add an absolute report URL variable. Resolve it:

```ts
import { resolveCspReportEndpoint } from "@bondery/helpers/security";
const reportEndpoint = resolveCspReportEndpoint(process.env);
```

That returns `${BONDERY_PUBLIC_API_URL}${API_ROUTES.SECURITY_CSP_REPORT}`.

`BONDERY_PUBLIC_API_URL` is already `requiredIn: ["development", "production"]`
and already reaches both proxies, so a second variable can only disagree with
the API it posts to. Deriving removes that class of drift. A previous
hand-written variable shipped a `.test` host into the production examples for
exactly this reason.

`BONDERY_PUBLIC_CSP_REPORT_ENABLED` is the only knob. It defaults to on; only
the exact value `false` (any case, surrounding space ignored) disables
reporting. A missing or mistyped value therefore cannot silence collection.

Both compose files pass `BONDERY_PUBLIC_CSP_REPORT_ENABLED:-true`, and
`BONDERY_PUBLIC_API_URL` is already in the container environment, so the
derivation needs no compose change.

## CORS

CORS lives in `apps/api/src/lib/platform/trusted-origins.ts`. One allowlist
serves CORS, Better Auth `trustedOrigins`, and the sync WebSocket origin check.

Content:

- Webapp origin and website origin.
- `bondery://` for mobile.
- `chrome-extension://<id>` for the store build.
- `BONDERY_PUBLIC_EXTRA_ALLOWED_ORIGINS` for anything else.
- Development only: `localhost` and `127.0.0.1` wildcards, `exp://`.

A request with no `Origin` header is allowed. Non-browser clients (mobile, the
extension background, server-to-server) send none.

**CORS is not authorization.** It decides whether a browser may read a
cross-origin response. It does not decide who may read data. Every tenant-owned
query still filters by the authenticated `userId`.

Do not narrow this allowlist as a security measure. Do not widen it to fix a
local port problem; use `BONDERY_PUBLIC_EXTRA_ALLOWED_ORIGINS`.

## Verify a live host

```bash
curl -sSI https://usebondery.com | grep -iE 'content-security-policy|strict-transport|x-content-type|referrer-policy|permissions-policy|cross-origin-opener|reporting-endpoints'
curl -sSI https://app.usebondery.com | grep -iE 'content-security-policy|strict-transport|x-content-type|referrer-policy|permissions-policy|cross-origin-opener|reporting-endpoints'
```

A correct webapp response carries both `content-security-policy` and
`content-security-policy-report-only`. If the enforced header is missing, check
the `config` export name in `proxy.ts` first.

Check one directive set:

```bash
curl -sSI https://app.usebondery.com/login \
  | tr ';' '\n' \
  | grep -E "script-src|style-src|frame-ancestors|base-uri"
```

## Local checks

```bash
pnpm run check:security-headers      # export name, shared builder, unsafe-inline
pnpm --filter webapp run test:proxy  # emitted header assertions
pnpm --filter website run test:proxy # emitted header assertions
pnpm --filter @bondery/helpers run test
```

## Review checklist

- [ ] The policy comes from `@bondery/helpers/security`, not a literal
- [ ] `proxy.ts` exports `config`, not `proxyConfig`
- [ ] `script-src` has no `'unsafe-inline'`
- [ ] `style-src` keeps `'unsafe-inline'` in the enforced policy only
- [ ] A new third-party origin is added to the builder input, never to `*`
- [ ] A new report endpoint is a `BONDERY_PUBLIC_*` var, and its absence omits reporting
- [ ] Trusted Types stays report-only until the sink audit covers every directive
- [ ] CORS changes go through `trusted-origins.ts`, and are not treated as authorization
