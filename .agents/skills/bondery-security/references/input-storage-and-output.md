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

| Route | Auth | Validation |
|-------|------|------------|
| `POST /contacts/:id/photo` | Session | MIME whitelist + magic bytes |
| `POST /contacts/import/vcard/parse` | Integration (API key OK) | vCard parser |
| `POST /me/import` | Session | ZIP magic, archive-root allowlist, entry/uncompressed caps, Zod export schemas |
| Global multipart | — | 100MB limit (`build-app.ts`) |

**Image validation** (`lib/platform/config.ts`):
- Allowed MIME: jpeg, png, gif, webp, avif, heic/heif
- Magic-byte check after read
- Intended max: 5MB (`AVATAR_UPLOAD.maxFileSizeBytes` in `@bondery/schemas`)

**Known gap (review trigger):** photo route calls `validateImageUpload({ size: 0, type: data.mimetype })` — file size is not enforced post-read. Only the 100MB global multipart limit applies. Fix: add post-buffer size check ≤ 5MB.

**vCard import:** no explicit size cap below 100MB global limit.

**Client-side:** webapp Instagram ZIP validates extension + MIME + 100MB cap (`instagram-import-helpers.ts`). Server-side zip bomb / path traversal not separately validated.

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

### Risk area (contact notes)

- `packages/helpers/src/notes/markdownToHtml.ts` — custom regex converter; **does not HTML-escape** input. Raw `<script>`, event handlers pass through.
- Webapp source mode: `ContactNotesSection.tsx` calls `editor.commands.setContent(html)` from textarea.
- API stores client-provided HTML without server-side sanitization (`domains/contacts/update-contact.ts`).
- DOMPurify is in lockfile but **not used** in notes paths.

**Review trigger:** sanitize HTML at one boundary — `markdownToHtml` output, API ingest, or TipTap `setContent`. Block `javascript:`, `data:` URL schemes in links.

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
- [ ] Upload: MIME whitelist + magic-byte check (+ size when gap is fixed)
- [ ] No string concatenation in SQL — Prisma parameterized queries only
- [ ] 5xx responses generic; details server-side only
- [ ] New error codes in catalog with translations
- [ ] HTML/markdown content reviewed for XSS if stored or rendered
- [ ] Public file routes documented if adding new buckets
- [ ] No secrets or PII in logs
