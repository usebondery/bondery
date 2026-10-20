# Webapp navigation (typed routes)

`typedRoutes` is on. Prefer the `route*` / `href*` / `redirect*` map:

| Prefix | Folder | Use |
|--------|--------|-----|
| `route*` | `route/` | Same-origin path → `Route` (`Link`, `push`, `redirect`) |
| `href*` | (mantine-next) | Link URL that may leave the origin (`hrefAssert`) |
| `redirect*` | `redirect/` | Server redirect |

**No barrel files.** Import the leaf module (e.g. `@/lib/navigation/route/person`, `@/lib/navigation/redirect/route`).

1. **`routeAssert(WEBAPP_ROUTES.*)`** from `route/assert` for static paths.
2. **Builders** — `routePerson`, `routeGroup`, `routeChatSession`, `routeWithQuery`, `routeSettings`, …
3. **`routeAssert(path)`** only after validation (`isSafeReturnPath`, capture helpers) or other trusted assembly.
4. **`routeFromReturn`** from `@/lib/auth/returnIntent` for branded `SafeAppReturnPath`.
5. **`redirectRoute`** (in-app) / **`redirectExternal`** (absolute URL outside the route table).

`useAppRouter` (`@/lib/navigation/useAppRouter`) exposes `pushRoute` / `replaceRoute`.

Reference: [Next.js statically typed links](https://nextjs.org/docs/app/api-reference/config/typescript#statically-typed-links).
