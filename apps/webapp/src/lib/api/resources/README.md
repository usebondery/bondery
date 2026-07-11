# API resources (path + parse)

Pure modules: URL builders and response parsers. **No** React, **no** `clientApiJson` / `serverApiJson`.

| Layer | Imports from resources |
|-------|------------------------|
| `lib/api/domains/*` | Client reads/writes |
| `lib/api/domains/server/*` | Server reads (cache tags, `server-only`) |
| `lib/app/getAppSession` | Layout session probe |

Hooks and loaders call **domains**, not resources directly.
