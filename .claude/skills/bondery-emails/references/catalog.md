# Email catalog

Living inventory of transactional emails. Update this file when adding or changing an email.

**Production ESP:** [Plunk](https://www.useplunk.com/) via SMTP (`BONDERY_PRIVATE_EMAIL_*`). Code is provider-agnostic; credentials come from the Plunk dashboard.

| Email | Template | Trigger | Subject | From | Reply-To | CC | Idempotency | Owner skill |
|-------|----------|---------|---------|------|----------|-----|-------------|-------------|
| Share contact | `ShareContactEmail` | User `POST` share contact API | `{sender} shared a contact with you • {name}` | `Robot from Bondery <address>` | Sender email | Sender email | None (user-initiated) | bondery-emails |
| Reminder digest | `ReminderDigestEmail` | pg-boss hourly job (`reminder-digest-hourly`) | `Bondery reminders for {date}` | `Robot from Bondery <address>` | — | — | `reminder_dispatch_log` per user/date | bondery-emails |
| Trial ending | `TrialEndingEmail` | Stripe `customer.subscription.trial_will_end` | `Your Bondery Premium trial is ending soon` | `Robot from Bondery <address>` | From address | — | `subscriptions.trial_ending_email_sent_at` | [bondery-payments](../../bondery-payments/references/trial-ending-email.md) |
| Account deleted | `AccountDeletedEmail` | Account teardown (Better Auth) | `Your Bondery account has been deleted` | `Robot from Bondery <address>` | From address | — | Best-effort (post-delete) | bondery-emails |
| Welcome | `WelcomeEmail` | Better Auth `user.create.after` | `Welcome to Bondery` | `Robot from Bondery <address>` | From address | — | `user_settings.welcome_email_sent_at` (claim-then-send) | bondery-emails |
| Sign-in link | `MagicLinkEmail` | User requests email sign-in (Better Auth `sendMagicLink`) | `Your Bondery sign-in link` | `Robot from Bondery <address>` | From address | — | None (user-initiated; previous token deleted on resend) | bondery-emails |
| Feedback (internal) | `FeedbackEmail` | User `POST /api/me/feedback` | `New feedback about Bondery` | `Robot from Bondery <address>` | User email | User email | None (user-initiated) | bondery-emails |

## Code pointers

Templates live under `packages/emails/src/templates/{account,billing,internal,notifications}/`. Senders import from `@bondery/emails`.

| Email | Folder | Template | Sender | Trigger |
|-------|--------|----------|--------|---------|
| Share contact | `notifications/` | `ShareContactEmail.tsx` | `apps/api/src/domains/contacts/share.ts` | Contact share route |
| Reminder digest | `notifications/` | `ReminderDigestEmail.tsx` | `apps/api/src/services/notifications/reminder-digest.ts` | `apps/api/src/services/notifications/reminder-dispatch.ts` |
| Trial ending | `billing/` | `TrialEndingEmail.tsx` | `apps/api/src/services/notifications/trial-ending.ts` | `apps/api/src/services/billing/webhook-handlers/trial-ending.ts` |
| Account deleted | `account/` | `AccountDeletedEmail.tsx` | `apps/api/src/services/notifications/account-deleted.ts` | `apps/api/src/lib/auth/teardown-user.ts` |
| Welcome | `account/` | `WelcomeEmail.tsx` | `apps/api/src/services/notifications/welcome.ts` | `apps/api/src/lib/auth/index.ts` (`databaseHooks.user.create.after`) |
| Sign-in link | `account/` | `MagicLinkEmail.tsx` | `apps/api/src/services/notifications/magic-link.ts` | `apps/api/src/lib/auth/send-magic-link.ts` (Better Auth `magicLink`) |
| Feedback | `internal/` | `FeedbackEmail.tsx` | `apps/api/src/services/notifications/feedback.ts` | `apps/api/src/routes/me/feedback/index.ts` |

Copy namespaces: `packages/translations/src/locales/{en,cs,de}/platform/email/*.json` (loaded in API via `email-i18n.ts`).
