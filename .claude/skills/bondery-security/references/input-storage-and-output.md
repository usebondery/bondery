# Input, storage, and output

Validation, uploads, XSS, error handling, and public file serving.

## Input validation layers

1. **Fastify/Zod OpenAPI** — `validatorCompiler` on routes with schemas (`build-app.ts`)
2. **`withDomainRoute`** — re-parses body/params/query with Zod in handlers
3. **Domain `assertDomain`** — business-rule assertions (`domains/_shared/context.ts`)
4. **Sync protocol** — version headers enforced (`lib/sync/protocol.ts`)

All user input is `unknown` until Zod-validated. Whitelist validation — not blacklist.

Schemas live in `@bondery/schemas`. Error catalog codes only (snake_case).

## File uploads

| Route | Auth | Size cap (`UPLOAD_LIMITS`) | Validation |
|-------|------|----------------------------|------------|
| `POST /contacts/:id/photo` | Session | `image` (5MB) | MIME whitelist before read, `buffer.length` re-check, magic bytes |
| `POST /me/photo` | Session | `image` (5MB) | Same checks in `uploadProfilePhoto` |
| `POST /import/vcard/parse` | Integration (API key OK) | `vcard` (100MB) | vCard parser |
| `POST /import/linkedin/parse` | Integration | `linkedinCsv` (100MB) | CSV parser |
| `POST /import/instagram/parse` | Integration | `instagramExport` (100MB) | Export parser |
| `POST /me/import` | Session | `bonderyExport` (100MB) | ZIP magic, archive-root allowlist, entry/uncompressed caps, Zod export schemas |
| Global multipart | — | `default` (5MB) | Ceiling for any route that sets no cap (`build-app.ts`) |

### Size limits: cap the stream, not the buffer

A size check after `toBuffer()` is not a limit. The bytes are already in memory, so a 100MB body costs 100MB of RAM and storage bandwidth before the check runs. That was the photo-route bug: the route validated MIME with `size: 0`, buffered the body, and only checked magic bytes.

- Every multipart read passes a cap while the body streams. `@fastify/multipart` cuts the file at `limits.fileSize` and throws `FST_REQ_FILE_TOO_LARGE` (413). A per-call `limits` overrides the global one.
- One file: `readUploadedFile(request, { allowedMimeTypes?, maxBytes })` (`lib/platform/uploads.ts`). It refuses a bad MIME type before reading the body, and turns an oversize file into 413 `validation_error` with the limit in the message.
- Several parts: `request.parts({ limits: { fileSize: UPLOAD_LIMITS.<name> } })`.
- Caps live in `UPLOAD_LIMITS` (`lib/platform/config.ts`). The image cap derives from `AVATAR_UPLOAD` in `@bondery/schemas`, shared with the webapp and the export-ZIP parser. Do not write a second number.
- The global ceiling is small (`UPLOAD_LIMITS.default`) on purpose. A new route is safe by default; a route that needs a bigger file names its own cap.
- Keep a post-read `buffer.length` check as defence in depth, and for callers that do not come through a route (MCP, import, tests).
- `fastify.multipart` does not enforce `bodyLimit`. Never assume Fastify's 1MB default covers a file.

**Enforced by:** Biome plugin `biome/plugins/no-uncapped-multipart.grit` (a `file()`, `files()`, `parts()` or `saveRequestFiles()` call with no `limits`), and `pnpm run check:input-safety` (the global registration must use `UPLOAD_LIMITS.default`, at or below 10MB).

**Image validation** (`lib/platform/config.ts`):
- Allowed MIME: jpeg, png, gif, webp, avif, heic/heif
- Size: `AVATAR_UPLOAD.maxFileSize` (5MB), streaming cap plus `validateImageUpload({ size: buffer.length })`
- Magic-byte check after read

**Client-side:** webapp Instagram ZIP validates extension + MIME + 100MB cap (`instagram-import-helpers.ts`). The server enforces its own cap; a client check is a UX convenience, never the control. Server-side zip bomb / path traversal for the Instagram export is not separately validated (the Bondery export ZIP is).

**Review trigger:** the vCard and Instagram caps are generous because exports can embed photos. Tighten them when real export sizes are known.

## Public file serving

`GET /files/:bucket/*` — **unauthenticated**, mounted under `composite` shell.

- Public buckets: `avatars`, `linkedin-logos` only
- Avatar path: `{userId}/{contactId}.jpg` (`avatar-storage.ts`)
- Local disk: path traversal guard via `resolvedFull.startsWith(resolvedRoot)` (`local-disk.ts`)
- S3: public CDN URL in production

**Security model:** public-by-URL with UUID obscurity. Upload/delete require authenticated domain handlers with `userId` checks.

**Review trigger:** consider signed/expiring URLs instead of permanent public paths.

## XSS and HTML rendering

### Safe pattern (chat)

`apps/webapp/.../chat/components/message/ChatMessage.tsx` — React nodes via `parseInlineTokens` (`packages/helpers/src/text/inline-tokens.ts`). Links restricted to `https?://`.

### Contact notes (stored HTML)

Notes are stored as HTML written by the Tiptap editor (web), built from Markdown (mobile, `markdownToHtml`), or supplied as plain text or HTML by MCP, the chat assistant, the Chrome extension, API keys, and ZIP import. Treat every one of those as untrusted: a stored `<script>`, `<img onerror>`, or `javascript:` link outlives the session that wrote it and reaches every client, export, email, and share view that renders it without an editor schema in between.

Rules:

- **The API is the trust boundary.** `sanitizeNotesHtml()` (`apps/api/src/lib/notes/sanitize-notes-html.ts`, built on `sanitize-html`) reduces notes to the editor's own tag and attribute allowlist before any write. It runs in `applyContactPatch` (REST create and update, MCP, chat tools, extension upsert) and in `import-apply` (Bondery ZIP). A new code path that writes `people.notes` calls it too.
- **Allowlist, not blocklist.** Tags, attributes, `style` (colour only), `class` (`language-*` only), and link schemes (`http`, `https`, `mailto`, `tel`) are named. `javascript:`, `data:`, `vbscript:`, protocol-relative, and relative `href`s are dropped; links get `rel="noopener noreferrer"` and `target="_blank"`. `script`, `style`, and `textarea` lose their body. Keep the list in step with the Tiptap extensions in `usePersonNotesEditor.ts`; a tag missing from the list is silently dropped on save.
- **Idempotent.** `sanitizeNotesHtml(sanitizeNotesHtml(x)) === sanitizeNotesHtml(x)`, so double sanitizing on a retry or an import is safe.
- **Escape on the way in, too.** `markdownToHtml` HTML-escapes `& < > " '` before any Markdown rule runs and keeps only `http(s)`, `mailto`, and `tel` link targets. Markdown input is text, not HTML. `htmlToMarkdown` decodes entities in a single pass so the round trip stays lossless. The API still sanitizes; the client function must not rely on that.
- **Length is capped.** `CONTACT_FIELD_MAX_LENGTHS.notesHtml` (20000) applies to the create, update, and extension-import schemas, not only the notes-only schema. Sanitizing can grow a string (`<` becomes `&lt;`), so the cap is on the input.
- **Render as text or through a schema.** The webapp renders notes through Tiptap's schema parser (`setContent`), which drops unknown nodes. Any new consumer (email, export, share, read-only view) renders the stored value through React text nodes or an equivalent allowlist, never `innerHTML`.
- **Existing rows are not rewritten.** Notes stored before the sanitizer shipped keep their original value until the next edit. They are safe in the webapp (schema parse) and the mobile editor (converted to Markdown text). A new HTML consumer must sanitize on read or run a backfill first (a backfill must emit sync changes so mobile stays in step).

**Enforced by:** `pnpm run check:input-safety` fails when an API module writes `notes` into `people` (Prisma `create`, `update`, `upsert`, `createMany`, or raw `SET notes =`) without calling `sanitizeNotesHtml`. Biome plugin `biome/plugins/no-raw-html-sink.grit` rejects `innerHTML =`, `outerHTML =`, `insertAdjacentHTML`, and `document.write`; Biome's `noDangerouslySetInnerHtml` covers React. Suppress a deliberate write with `// biome-ignore lint/plugin: <why this value is safe>`.

**Known limitation:** a user who types the literal text `<u>x</u>` in the editor sees it become underlined after a trip through Markdown mode, because `<u>` is the only raw tag Markdown mode accepts. It is a fidelity quirk, not a security issue.

### Security headers

See [headers-csp-and-cors.md](./headers-csp-and-cors.md) for the per-surface header matrix, the shared CSP builder, and the reporting endpoint. Do not restate the table here.

## Error handling (no data leakage)

`apps/api/src/lib/platform/errors/map-to-response.ts`:
- Validation → `validation_error` + optional `param`
- `DomainError` → catalog code
- **5xx messages sanitized** to `"Internal Server Error"` for client
- 5xx logged server-side with `err`, `userId`, `reqId`
- Rate limit → `rate_limit_exceeded` + `retry_after`

**Rules:**
- Never return `error.stack` or internal details to clients
- Use catalog codes via `internal()`, `unauthorized()`, etc. (`http-errors.ts`)
- CI: `check-route-errors`, `check-no-flat-error-responses`, `check-api-errors-translations`

Client display: `bondery-ux` → `references/common/api-errors-display.md`.

## Logging

`apps/api/src/lib/platform/logger.ts` — bare Pino, `LOG_LEVEL` env.

**Rules:**
- No passwords, tokens, API keys, or session cookies in logs
- No full contact PII in info-level logs
- 5xx: log full `err` server-side only

**Known gap (review trigger):** no Pino `redact` paths configured for `Authorization`, cookies, tokens.

## Input/output checklist

- [ ] All user input validated with Zod before use
- [ ] Upload: MIME whitelist + magic-byte check + a size cap on the stream (`readUploadedFile` or `limits.fileSize`), named in `UPLOAD_LIMITS`
- [ ] No string concatenation in SQL — Prisma parameterized queries only
- [ ] 5xx responses generic; details server-side only
- [ ] New error codes in catalog with translations
- [ ] Stored or rendered HTML/markdown: sanitized on write at the API (`sanitizeNotesHtml` or an equivalent allowlist) and rendered as text or through a schema, never `innerHTML`
- [ ] Every free-text field that can hold markup has a max length in `@bondery/schemas`
- [ ] Public file routes documented if adding new buckets
- [ ] No secrets or PII in logs
