# Website navigation (typed routes)

`typedRoutes` is on. Prefer the `route*` / `href*` / `redirect*` map:

| Prefix | Folder | Use |
|--------|--------|-----|
| `route*` | `route/` | Same-origin path → `Route` (client-safe) |
| `href*` | `href/` | Absolute links (webapp CTAs); `hrefAssert` from mantine-next for data URLs |
| `redirect*` | `redirect/` | Server redirect |

**No barrel files.** Import the leaf module:

- `"use client"`: `@/lib/navigation/route/assert` only. Do not import `href*` / `redirect*` — those read server env.
- Server Components / route handlers: `@/lib/navigation/href/webapp`, `@/lib/navigation/redirect/webapp`, `@/lib/navigation/redirect/external`.

1. **`routeAssert(...)`** for marketing paths (including ones outside the page union, e.g. `/docs`).
2. **`hrefWebapp` / `hrefWebappLogin`** for absolute links into the webapp (server only).
3. **`redirectWebapp` / `redirectExternal`** for server redirects to the webapp or other origins.
4. **`hrefAssert`** from `@bondery/mantine-next` for external `https` / `mailto` strings from data tables.

`check:types` runs `next typegen` before `tsc`.

Reference: [Next.js statically typed links](https://nextjs.org/docs/app/api-reference/config/typescript#statically-typed-links).
