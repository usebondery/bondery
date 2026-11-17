# Triggers and idempotency

## Trigger map

| Email | Trigger | Path |
|-------|---------|------|
| Reminder digest | pg-boss `reminder-digest-hourly` | `services/notifications/reminder-dispatch.ts` → `reminder-digest.ts` |
| Trial ending | Stripe `customer.subscription.trial_will_end` | `webhook-handlers/trial-ending.ts` → `sendTrialEndingEmail` |
| Account deleted | User teardown | `lib/auth/teardown-user.ts` → `sendAccountDeletedEmail` |
| Share contact | User API | `domains/contacts/share.ts` |
| Feedback | User API | `routes/me/feedback/` → `sendFeedbackEmail` |

## Idempotency rules

**Required** for automated sends (webhooks, cron, jobs). **Not required** for user-initiated one-shot actions.

### Reference: trial ending

Stripe may retry webhooks. Pattern:

1. Handler checks `subscriptions.trial_ending_email_sent_at`
2. Send email
3. Set `trial_ending_email_sent_at` before or after send (see [bondery-payments trial-ending-email](../../bondery-payments/references/trial-ending-email.md))

### Reminder digest

- **Per-user per-date dedup:** `reminder_dispatch_log` table
- Job writes log after dispatch; unique constraint prevents double-send
- **Partial failure:** `sendReminderDigest` returns `failedUsers` / `failures` array — continues batch on per-recipient errors
- **Locale:** preloads `ReminderDigestEmail` namespace for all supported locales once per job run

### Account deleted

Best-effort send during teardown — user may already be deleted from DB; failure should not block deletion. Locale is snapshotted before teardown when possible.

## Jobs vs HTTP

Production reminder path is **pg-boss only**. There is no internal HTTP route for reminder digests — do not reintroduce pg_cron → HTTP round-trips.

## New automated email checklist

- [ ] Dedup key defined (DB column, event-id table, or log)
- [ ] Webhook handler idempotent at route level too (see Stripe `stripe_webhook_events`)
- [ ] Graceful skip when SMTP unconfigured
- [ ] Locale resolved in API; template receives `copy` props
- [ ] Log failures with context; no PII in logs ([bondery-security](../../bondery-security/SKILL.md))
