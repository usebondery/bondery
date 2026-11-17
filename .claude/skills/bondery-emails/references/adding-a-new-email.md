# Adding a new email

Step-by-step recipe for a new transactional email. Follow this even if you are only changing an existing one — the chrome and folder rules are the contract.

## 1. Pick the folder

Templates live under `packages/emails/src/templates/<folder>/YourEmail.tsx`. Never drop a new file in the templates root.

| Folder | Use for | Today |
|--------|---------|-------|
| `account/` | Sign-up, sign-in, account lifecycle | Magic link, welcome, account deleted |
| `billing/` | Subscriptions, trials, invoices | Trial ending |
| `internal/` | Mail the Bondery team reads | Feedback |
| `notifications/` | Product mail triggered from client apps (and scheduled product reminders) | Share contact, reminder digest |

If it does not fit, extend this table in [templates-and-branding.md](./templates-and-branding.md) — do not invent a fifth folder without documenting it.

## 2. Add the template

Create `packages/emails/src/templates/<folder>/YourEmail.tsx`:

- Wrap in `EmailWrapper` with **required** `preview` (complements subject, ≤90 chars), `title`, `lang`, `dir`, `chrome`, and `websiteUrl`. React Email [`<Preview>`](https://react.email/docs/components/preview).
- Put body copy in `EmailBody`: heading → description → contents (`children`) → optional `cta` → notes.
- Use `EmailCta` only through `EmailBody`’s `cta` prop. Full-width, centered. Do **not** print the destination URL under the button. Do not left-align the logo or the button.
- Pass `manageNotificationsUrl` **only** if the recipient can configure that mail (reminder digest → Settings). Do not add a marketing unsubscribe. [email-types.md](./email-types.md).
- Leave `showLegalEntity` unset (false) unless this is promotional/marketing mail.
- Set `showHelp={false}` only for `internal/` mail.
- Import branding from `@bondery/branding` — no one-off colors or logos.
- Do not duplicate the header logo or legal footer — `EmailWrapper` owns both (centered logotype; `LEGAL_ENTITY` only when `showLegalEntity`).
- Body paragraphs use the same 16px `descriptionStyle`. `notes` is muted 14px — use it for why-receiving / expiry / reply guidance, not the main closing line.
- Export props type and default component.
- Add English preview defaults in `packages/emails/src/fixtures/default-copy.ts`. Keep fixture `preview` strings ≤90 characters after typical interpolation.

See [templates-and-branding.md](./templates-and-branding.md) and [ux-email-design.md](./ux-email-design.md).

## 3. Export from the package

API senders import from the barrel (`import { YourEmail } from "@bondery/emails"`). Keep that.

1. Re-export from `packages/emails/src/index.ts`.
2. Add `./templates/<folder>/YourEmail` to `packages/emails/package.json` `exports`.
3. Run `pnpm run sync-exports -w @bondery/emails` if your workflow requires it.
4. Build: `pnpm --filter @bondery/emails run compile`.

## 4. Preview locally

```bash
pnpm run dev:emails
```

Opens port **26639** on `src/templates/` (nested folders show as `account/YourEmail`, etc.). See [dx-preview-and-test.md](./dx-preview-and-test.md).

## 5. Add copy (en / cs / de)

1. Add `packages/translations/src/locales/{en,cs,de}/platform/email/YourEmail.json`.
2. Register the namespace in `packages/translations/manifest.json` with `"platforms": ["email"]`.
3. Run `pnpm run i18n:types`.
4. Keep `default-copy.ts` English in sync with `en/.../YourEmail.json`.

Do **not** use `react-i18next` hooks in templates.

## 6. Add a sender in the API

Create `apps/api/src/services/notifications/your-email.ts`:

```typescript
import { YourEmail } from "@bondery/emails";
import { emailDocumentProps } from "../../lib/notifications/email-chrome.js";
import { formatEmailFrom } from "../../lib/notifications/email-from.js";
import { renderEmailParts } from "../../lib/notifications/render-email.js";
import {
  isEmailConfigured,
  requireEmailConfig,
  sendRenderedEmail,
} from "../../lib/notifications/transporter.js";
```

- Use `isEmailConfigured()` — return early with `log?.warn` when false (automated sends).
- Use `sendRenderedEmail(options, log)` — do not call `createTransport` or `createEmailTransporter` from services.
- Render with `renderEmailParts` so Nodemailer sends `multipart/alternative` (`html` + `text` from [`toPlainText`](https://react.email/docs/utilities/render#4-convert-to-plain-text)).
- Resolve locale with `resolveEmailLocale` (or document sender-locale rule for external recipients).
- Load copy with `loadEmailNamespace` + `email-copy-builders.ts`; pass `copy` and `...emailDocumentProps(lng, subject)` into the template.
- From name: `formatEmailFrom(config.fromAddress)` — one display name, `EMAIL_FROM_DISPLAY_NAME` (`Robot from Bondery`). Do not put display names in env. See [sending-and-env.md](./sending-and-env.md).
- Digest (and any future configurable mail): also pass `manageNotificationsUrl: appSettingsUrl()`.

## 7. Wire the trigger

| Trigger type | Where to wire |
|--------------|---------------|
| User API action | Route handler → service |
| Stripe webhook | `services/billing/webhook-handlers/` |
| Scheduled job | `lib/jobs/schedules.ts` + worker |
| Auth lifecycle | `lib/auth/` teardown or hooks |

For automated sends, add idempotency — see [triggers-and-idempotency.md](./triggers-and-idempotency.md).

## 8. Update the catalog

Add a row to [catalog.md](./catalog.md) with folder path, trigger, subject, from/replyTo, idempotency, and owner skill.

## 9. Cross-skill updates

- **bondery-payments** — if billing-related trigger
- **bondery-legal** — if new ESP or new data categories sent to vendor
- **bondery-changelog** — if user-visible
- OpenAPI / schemas — if new API surface

## 10. Pre-ship

Run the checklist in [SKILL.md](../SKILL.md#pre-ship-checklist).

## Anti-patterns

- Sending from webapp or mobile
- Marketing broadcasts in `@bondery/emails`
- Duplicating nodemailer config
- Rebuilding header/footer/CTA instead of using `EmailWrapper` / `EmailBody` / `EmailCta`
- Putting a new template in `src/templates/` root
- Adding an unsubscribe / manage-notifications footer to mail that is not configurable (auth, billing, share, welcome)
- Omitting manage-notifications on reminder digest
- Showing legal name/address on transactional mail, or hardcoding it
- Printing the CTA URL under the button, left-aligning the logo, or using a non-full-width CTA
- Shipping without `<Preview>` or with preview text over 90 characters
- Sending HTML-only (skipping `renderEmailParts` / `text`)
- New ESP without updating [subprocessor registry](../../bondery-legal/references/subprocessor-registry.md)
- Fake bounce addresses in tests (damages sender reputation)
