# Env and manifest

Source of truth: `apps/chrome-extension/wxt.config.ts`. Product values are **inlined at WXT build time**, not read at runtime from the host env.

## Required `BONDERY_PUBLIC_*`

| Variable | Used for |
|----------|----------|
| `BONDERY_PUBLIC_API_URL` | Fastify origin (`config.apiUrl`) |
| `BONDERY_PUBLIC_WEBAPP_URL` | App links (`config.appUrl`), `host_permissions` origin |
| `BONDERY_PUBLIC_OAUTH_CLIENT_ID` | PKCE public client |

Vite `envPrefix`: `BONDERY_PUBLIC_`, `BONDERY_EXTENSION_` (`BONDERY_EXTENSION_FLAVOR=production|staging`), `WXT_` (framework, e.g. `WXT_DEBUG`). Do not introduce `VITE_` or unprefixed keys.

`hooks.build:before` warns in development if any required var is missing; **throws in production**. In production **CI** (`CI` or `GITHUB_ACTIONS`) it also throws if API/webapp URLs match `localhost` or `127.0.0.1`. A store zip with baked loopback origins is a shipped foot-gun.

`scripts/check-env.ts` uses `getRequiredVarsForTarget("chrome-extension", …)`. Production CI additionally requires `BONDERY_INFRA_CHROME_EXTENSION_ID`, `BONDERY_OPS_CHROME_PUBLISHER_ID`, and the Chrome signing secrets — those are **release/CI**, not local WXT bake. See [bondery-release extension.md](../../bondery-release/references/extension.md).

## `host_permissions` (computed)

Built from Instagram + LinkedIn URL patterns plus `loopbackHostPermissionPatterns(BONDERY_PUBLIC_WEBAPP_URL)` and, when different, the same helper for `BONDERY_PUBLIC_API_URL`. Local `localhost` origins also get the `127.0.0.1` alias (token/authorize fetches pin loopback HTTP to IPv4). Changing env origins changes the packed host list on the next build.

## Content-script matches

`entrypoints/webapp.content/index.tsx` always includes `https://app.usebondery.com/*` and `http://localhost/*`. Staging/local builds may add the baked `BONDERY_PUBLIC_WEBAPP_URL` origin. **`BONDERY_EXTENSION_FLAVOR=production` never adds extra hosts**, so CWS cannot ship `app.beta` matches even if the URL is wrong.

LinkedIn/Instagram matches are literal in those entrypoints.

## `permissions`

Today: `storage`, `identity`, `alarms`. Adding a permission is a **Chrome Web Store review event** — do not bundle it with an unrelated hotfix. Sequencing: [extension.md](../../bondery-release/references/extension.md).

## `web_accessible_resources`

Instagram MAIN-world interceptor:

```ts
resources: ["instagram-interceptor.js"]
matches: ["https://www.instagram.com/*", "https://instagram.com/*"]
```

Do not add other hosts to this list without a security review.

## Never force `NODE_ENV` in Vite `define`

`wxt.config.ts` sets `define: {}` on purpose. Forcing `process.env.NODE_ENV` to `"production"` in a development build leaves Vite’s React plugin emitting `jsxDEV`, while the production React build does not export it — the popup crashes. Leave `NODE_ENV` to Vite/WXT.

## Env / manifest checklist

- [ ] All three `BONDERY_PUBLIC_*` present for the build you are shipping
- [ ] Production CI bake has no localhost/127.0.0.1 API or webapp URL
- [ ] `host_permissions` still match the origins the SW actually fetches
- [ ] `webapp.content` matches: CWS production is prod + localhost; extra origin only when flavor is not production
- [ ] New `permissions` / `host_permissions` called out as a CWS review event
- [ ] Vite `define` still does not set `NODE_ENV`
