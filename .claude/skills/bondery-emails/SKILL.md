# Bondery Emails

## When to use

- Adding or changing React Email templates in `@bondery/emails`
- Wiring or modifying email send paths in `apps/api`
- Reminder digest jobs, share contact email, trial/account/feedback emails
- `BONDERY_PRIVATE_EMAIL_*` env vars or SMTP/Plunk configuration
- Email preview, branding, accessibility, or deliverability for product mail

## Do not activate for

- Contact **email fields** in CRM UI (phone/email inputs) → [bondery-ux](../bondery-ux/SKILL.md)
- Human support replies (GitHub issues, inbox, reviews) → [bondery-support-replies](../bondery-support-replies/SKILL.md)
- Stripe billing logic or webhook maps → [bondery-payments](../bondery-payments/SKILL.md)
- Auth/session security → [bondery-security](../bondery-security/SKILL.md)
- Generic React Email craft without Bondery paths → upstream `email-best-practices`

## Non-negotiables

1. **Templates only in `packages/emails`** — wrap with `EmailWrapper` + `EmailBody`; branding from `@bondery/branding`.
2. **Put the file in the right folder** — `account/`, `billing/`, `internal/`, or `notifications/` (see [templates-and-branding.md](references/templates-and-branding.md)).
3. **Send only from `apps/api`** — never webapp, mobile, or website.
4. **Use shared transporter singleton** — call `sendRenderedEmail` from `transporter.ts`; never call `createTransport` from services.
5. **Production ESP:** Plunk via SMTP (`BONDERY_PRIVATE_EMAIL_*`); update [subprocessor registry](../bondery-legal/references/subprocessor-registry.md) when changing provider.
6. **Secrets via env manifest** — no credentials in code or templates.
7. **No PII in logs** — log send failures without full email bodies or contact fields.
8. **Idempotent automated sends** — webhooks and jobs must not double-send.
9. **Fail fast in dev/prod** — missing or invalid SMTP fails boot (`initEmailTransport`). Development also refuses a non-loopback SMTP host (use Mailpit). In `NODE_ENV=test`, automated paths no-op when unconfigured (warn log, do not crash webhooks).
10. **Update [catalog.md](references/catalog.md)** when adding or changing an email.
11. **Inbox preview required** — every template passes `preview` into `EmailWrapper` (React Email [`<Preview>`](https://react.email/docs/components/preview)). Complements the subject; **≤90 characters** (`clipEmailPreview` / `EMAIL_PREVIEW_MAX_CHARS`).
12. **HTML + plaintext** — send `multipart/alternative` via `renderEmailParts` (`render` then [`toPlainText`](https://react.email/docs/utilities/render#4-convert-to-plain-text)). Use `data-skip-in-text="true"` only on decorative HTML you want omitted from plaintext (not the header logo).
13. **Footer chrome by type** — legal name/address (`showLegalEntity`) only on promotional/marketing mail. “Manage these notifications” (`manageNotificationsUrl`) only when the recipient can configure that mail (reminder digest → Settings). Not a marketing unsubscribe.

## Decision tree

| Task | Read |
|------|------|
| System overview | [references/architecture.md](references/architecture.md) |
| All live emails | [references/catalog.md](references/catalog.md) |
| Add a new email | [references/adding-a-new-email.md](references/adding-a-new-email.md) |
| Templates, chrome, folders, branding | [references/templates-and-branding.md](references/templates-and-branding.md) |
| Env vars, transporter, from/replyTo | [references/sending-and-env.md](references/sending-and-env.md) |
| Preview and testing | [references/dx-preview-and-test.md](references/dx-preview-and-test.md) |
| Triggers, jobs, idempotency | [references/triggers-and-idempotency.md](references/triggers-and-idempotency.md) |
| Subject, preview text, mobile UX | [references/ux-email-design.md](references/ux-email-design.md) |
| Accessibility | [references/accessibility.md](references/accessibility.md) |
| Transactional vs marketing, unsubscribe, postal address | [references/email-types.md](references/email-types.md) and [bondery-legal emails](../bondery-legal/references/emails.md) |
| DNS, Plunk, inbox placement | [references/deliverability.md](references/deliverability.md) |
| Trial-ending **billing trigger** | [bondery-payments trial-ending-email](../bondery-payments/references/trial-ending-email.md) |
| Generic React Email / Resend patterns | `email-best-practices` (`.agents/skills/email-best-practices/SKILL.md`) |

## Cross-skill owners

| Domain | Owner |
|--------|-------|
| Stripe trial webhook + `trial_ending_email_sent_at` | [bondery-payments](../bondery-payments/SKILL.md) |
| Voice, sentence case | [bondery-ux](../bondery-ux/SKILL.md) |
| Sentence craft for body copy | [bondery-writing](../bondery-writing/SKILL.md) Orwell-Hemingway |
| PII, rate limits, trigger auth | [bondery-security](../bondery-security/SKILL.md) |
| Plunk subprocessor, marketing vs transactional email | [bondery-legal](../bondery-legal/SKILL.md) → [emails.md](../bondery-legal/references/emails.md) |
| User-visible release notes | [bondery-changelog](../bondery-changelog/SKILL.md) |

## Pre-ship checklist

### Template (`@bondery/emails`)

- [ ] File lives in `src/templates/{account|billing|internal|notifications}/`, not the templates root
- [ ] Uses `EmailWrapper` + `EmailBody` (+ `EmailCta` via `EmailBody` `cta` prop) — do not rebuild header/footer
- [ ] Distinct `preview` via `EmailWrapper` (React Email [`<Preview>`](https://react.email/docs/components/preview)) — complements subject, **≤90 characters**
- [ ] `lang` / `dir` / `chrome` from `emailDocumentProps` (API) or defaults (preview)
- [ ] Branding from `@bondery/branding` — no one-off colors/assets
- [ ] Do not hardcode legal name/address. `showLegalEntity` stays **false** unless this is promotional/marketing mail
- [ ] Header logo stays **centered**; never left-align or duplicate it in the template
- [ ] Single primary CTA: **full-width, centered**; **no raw URL under the button**
- [ ] Body copy uses `descriptionStyle` (16px). Use `notes` only for why-receiving / expiry / reply guidance
- [ ] `manageNotificationsUrl` **only** for configurable product mail (reminder digest → Settings). No marketing unsubscribe / `List-Unsubscribe` on transactional mail — [email-types.md](references/email-types.md)
- [ ] `showHelp={false}` only for internal ops mail (`internal/`)
- [ ] Critical layout uses inline styles (don't rely on Tailwind alone)
- [ ] Previewed via `pnpm run dev:emails`; checked in a mobile-width client
- [ ] Accessibility: heading order, descriptive links, alt text, contrast ≥ 4.5:1
- [ ] No secrets, tokens, or unnecessary PII in body

### Copy and UX

- [ ] Voice matches [bondery-ux](../bondery-ux/SKILL.md) (sentence case, second person, active); sentence craft is Orwell-Hemingway in [bondery-writing](../bondery-writing/SKILL.md)
- [ ] No greeting (“Hi there,”) — start with the heading
- [ ] Heading must not duplicate the CTA label
- [ ] Subject specific, ~60 chars, no spam triggers
- [ ] "Why you're receiving this" line for automated sends
- [ ] English + Czech + German namespaces; fixtures in `default-copy.ts` stay in sync with `en`

### Sending (API)

- [ ] Uses shared transporter singleton via `sendRenderedEmail` ([transporter.ts](../../apps/api/src/lib/notifications/transporter.ts))
- [ ] Renders with `renderEmailParts` and passes both `html` and `text` ([render-email.ts](../../apps/api/src/lib/notifications/render-email.ts); [`toPlainText`](https://react.email/docs/utilities/render#4-convert-to-plain-text))
- [ ] `from` is `formatEmailFrom(config.fromAddress)` — display name `EMAIL_FROM_DISPLAY_NAME` (`Robot from Bondery`). Not env. [sending-and-env.md](references/sending-and-env.md)
- [ ] `emailDocumentProps(lng, subject)` for chrome, locale, and origins; digest also passes `manageNotificationsUrl: appSettingsUrl()`
- [ ] Graceful no-op when SMTP not configured (automated paths)
- [ ] Idempotent for webhooks/cron sends
- [ ] Appropriate API error for user-initiated failures

### Security and legal

- [ ] Trigger path authenticated/scoped ([bondery-security](../bondery-security/SKILL.md))
- [ ] Classified in [email-types.md](references/email-types.md); marketing mail is out of scope until [bondery-legal emails](../bondery-legal/references/emails.md)
- [ ] New/changed ESP → update [subprocessor registry](../bondery-legal/references/subprocessor-registry.md)

### Monorepo hygiene

- [ ] Export added to `packages/emails/package.json` + `index.ts` (barrel + nested subpath)
- [ ] Entry in [catalog.md](references/catalog.md)
- [ ] Cross-skill owner doc updated if billing-specific
- [ ] User-visible change → [bondery-changelog](../bondery-changelog/SKILL.md) entry
