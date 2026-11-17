# Security review playbook

How to review security-sensitive changes: severity, evidence, testing, and false-positive control.

## When to run a security review

Activate for changes touching:
- Auth, authorization, sessions, cookies, OAuth
- New API routes or changes to route shells
- Secrets, env vars, deployment config
- File uploads, HTML/markdown storage, public file serving
- Webhooks, payments, AI tools
- Extension bridges, `postMessage`, content scripts
- Mobile SQLite, token storage, deep links
- Tenant data access patterns (Prisma queries)

Skip for: copy changes, styling, non-security refactors, routine API contract work covered by `bondery-api`.

## Review process

1. **Identify trust boundaries** crossed by the change (see `security-architecture.md`).
2. **Read the relevant reference** from the decision tree in `SKILL.md`.
3. **Trace the auth path** — shell → strategy → domain → Prisma query.
4. **Check tenant scoping** — every query filters by authenticated `userId`.
5. **Look for data leakage** — logs, error responses, client bundles.
6. **Run contextual verification commands** (only what applies).
7. **Report findings** with severity, file path, attack path, and remediation.

## Severity levels

| Level | Criteria | Example |
|-------|----------|---------|
| **Critical** | Exploitable without auth; full tenant data breach; secret exposure | Missing `userId` filter on list endpoint |
| **High** | Exploitable with low-privilege auth; partial data leak | IDOR on single resource by guessing UUID |
| **Medium** | Requires specific conditions; defense-in-depth gap | Missing upload size check; no log redaction |
| **Low** | Theoretical or heavily mitigated | Non-timing-safe service secret compare |
| **Info** | Improvement opportunity; known documented gap | Webapp CSP not configured |

**Require a plausible attack path before assigning High or Critical.**

## Evidence format

For each finding:

```
**[Severity] Title**
- File: `path/to/file.ts:line`
- Attack path: how an attacker exploits this
- Impact: what data or access is compromised
- Remediation: specific fix (link to pattern in references/)
```

## Negative tests to require

For security-sensitive features, require tests covering:

| Scenario | Expected |
|----------|----------|
| Unauthenticated request | 401 `auth_required` |
| Wrong user's resource ID | 404 (not 403) |
| Invalid/malformed input | 400 `validation_error` |
| Missing webhook signature | 400/401 rejection |
| Expired/reused WS ticket | Rejection |
| API key on session-only route | 401/403 |
| Oversized upload | 400 rejection (when size check exists) |

Existing test infrastructure:
- `route-security-audit.test.ts` — every shelled route has `openApiArea`
- `auth-integration.test.ts` — OAuth PKCE, JWT rejection, scope enforcement
- `contacts-groups-tenant-isolation.test.ts` — cross-tenant regression
- `map-error-to-response.test.ts` — 5xx sanitization

## Known-safe patterns (do not flag)

| Pattern | Why it's safe |
|---------|---------------|
| API CSP disabled | JSON API returns no HTML |
| `SameSite=Lax` on webapp cookies | Required for OAuth redirect |
| No `Origin` CORS pass-through | Non-browser clients (mobile, extension) |
| Public `/files` route | Intentional; UUID obscurity + upload auth |
| Global rate limit 300/min | Redis-backed in production |
| Prisma queries without RLS | App-layer scoping is the model — flag missing `userId`, not missing RLS |
| Legacy `supabase-db` migrations | Not active API path unless explicitly touched |
| API CSP disabled | JSON API returns no HTML |
| `require-trusted-types-for` report-only | Enforced, it aborted React hydration. Report-only collects evidence first — see [headers-csp-and-cors.md](./headers-csp-and-cors.md#trusted-types) |
| `style-src 'unsafe-inline'` in the enforced policy | Mantine writes inline styles. `script-src` still carries the nonce |
| CSP report endpoint unauthenticated | A browser cannot send a secret. Rate limited, body-capped, and never echoed |

## False-positive controls

**Do not flag:**
- Generated OpenAPI files, lockfiles, or example env values
- Historical Supabase migrations unless the change modifies them
- `SameSite=Lax` as CSRF vulnerability without a specific cookie-authenticated endpoint at risk
- Missing RLS as API vulnerability — flag missing `userId` scoping instead
- `npm audit` warnings without exploitability assessment
- Express/Next.js generic security advice not grounded in Bondery code

**Do flag:**
- Missing `userId` in Prisma `where` on tenant-owned tables
- Auth hooks inside route module files (CI should catch, but verify)
- Secrets in source code or client bundles
- Webhook handlers that parse JSON before signature verification
- `dangerouslySetInnerHTML` or unsanitized HTML storage without documented threat model
- A wrong `config` export name in `proxy.ts`. Next.js ignores `proxyConfig` without an error, so the matcher and every header are silently dropped.
- A policy shipped without verification. Read the live header with `curl -sSI`. An unchanged local policy string proves nothing about what a browser receives.

## Review checklist

- [ ] Trust boundaries identified for the change
- [ ] Auth path traced: shell → strategy → domain → query
- [ ] Tenant scoping verified on all new/modified queries
- [ ] No secrets or PII in logs, errors, or client output
- [ ] Negative tests proposed or present for auth/authz scenarios
- [ ] Findings include severity, file, attack path, remediation
- [ ] Known-safe patterns not flagged as vulnerabilities
- [ ] Known gaps documented as review triggers, not hidden
