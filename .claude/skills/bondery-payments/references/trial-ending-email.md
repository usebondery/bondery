# Trial-ending email

**Trigger:** `customer.subscription.trial_will_end` (~3 days before trial end).

**Handler:** `apps/api/src/services/billing/webhook-handlers/trial-ending.ts` — idempotent via `trial_ending_email_sent_at` on `subscriptions`.

**Template and delivery:** See [bondery-emails catalog](../bondery-emails/references/catalog.md) — `TrialEndingEmail`, `sendTrialEndingEmail`, Plunk SMTP.
