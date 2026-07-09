# Server-only domain reads

RSC loaders and prefetch helpers import from here — never from client bundles.

- Each module mirrors client `lib/api/domains/<name>.ts` read signatures.
- Set `next: { tags: [...] }` for cache invalidation via `revalidateTag`.
- Use `transportPolicy: false` only for routing probes (`probeSettingsServer`).

Client hooks must import from `lib/api/domains/*`, not this folder. CI enforces `import "server-only"` on every file here.
