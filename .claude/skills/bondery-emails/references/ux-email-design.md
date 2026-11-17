# UX email design

Email-specific UX rules. For voice and tone, inherit from [bondery-ux](../../bondery-ux/SKILL.md) → `references/common/ux-writing.md`. Body-copy sentence craft is Orwell-Hemingway in [bondery-writing](../../bondery-writing/references/orwell-hemingway.md).

## Audiences

Design every template for the person who opens it — not only for the logged-in Bondery user.

| Audience | Who | Typical mail | UX implications |
|----------|-----|--------------|-----------------|
| **Account holders** | People with a Bondery account | Sign-in link, welcome, trial, digest, account deleted | Clear why-receiving; CTA into *their* app origin; digest gets “Manage these notifications” → Settings; no marketing unsubscribe |
| **Third-party recipients** | Someone who was shared a contact; they may have never heard of Bondery | Share contact | Personal tone; contact card first; reply goes to the *sender*; no “manage in Bondery”; no assumption they have an account |
| **Self-host operators and their users** | Operator’s SMTP, operator’s domains | Same templates on a private instance | From address and app/website URLs come from env; logo is still Bondery today. Legal HQ is off on transactional mail; if marketing mail later enables `showLegalEntity`, it would still print Sveetech (known gap — not white-label) |

If a line only makes sense for an account holder (Settings, “your trial”), do not put it on share-contact mail.

## Hierarchy

1. **Preview text** — inbox snippet; completes the subject, does not repeat it
2. **Header** — **always centered** linked Bondery logotype (via `EmailWrapper`). Never left-align the logo.
3. **H1** — one headline; the main point; must not duplicate the CTA label
4. **Description** — one short paragraph that sets context
5. **Contents** — lists, fields, or extra detail when needed
6. **Primary action** — one full-width centered button (`EmailCta`) if action is needed
7. **Notes** — “why you got this”, expiry, or reply guidance below the CTA
8. **Footer** — help (support + docs) or internal note; **“Manage these notifications”** only when that mail is configurable (digest); legal name and address **only** on marketing (`showLegalEntity`).

Do not open with a greeting (“Hi there,”). Put the useful title first.

## Subject lines

- Specific and scannable (~60 characters)
- Sentence case, no ALL CAPS or spam triggers
- Examples: `Your Bondery Premium trial is ending soon` ✅ — `SUBSCRIPTION EXPIRATION NOTICE` ❌

## Preview text

Every template must pass `preview` into `EmailWrapper`, which renders React Email [`<Preview>`](https://react.email/docs/components/preview). Inbox clients show this snippet before the message is opened.

- Complements the subject — do not repeat the subject verbatim
- Keep it **under 90 characters** (`EMAIL_PREVIEW_MAX_CHARS`). Wrapper clips with an ellipsis if interpolation (names, emails) runs long
- Write preview strings in each email namespace (`preview` / `previewMore` / `previewFallback`) and in `default-copy.ts`

## Mobile

- Single column (already default)
- Min **16px** body text
- Touch targets for buttons ≥ 44px; CTA is full-width so it is easy to tap
- Test iOS Mail and Gmail app, not just React Email preview

## One primary CTA

Transactional emails should have at most one primary action. Secondary links are fine; avoid competing buttons.

- `EmailCta` is a **full-width, centered** brand button.
- Do **not** print the destination URL under the button.
- Inline links in body copy are fine when the URL itself is the content (for example a website field on a shared contact).

## Dark mode

Design for white background first. Use brand colors with sufficient contrast on white; avoid pure `#000` text. Email clients may force dark mode with unpredictable results — do not block ship on dark-mode parity.

## Automated sends

Include a brief line explaining why the recipient is receiving the email (e.g. "You're receiving this because you turned on reminders for these dates.").

Reminder digest also includes “Manage these notifications” → Settings. Other automated mail does not. Classification: [email-types.md](./email-types.md).

## User-initiated sends

Share contact emails represent the sender — tone should feel personal, not robotic. From display name is still `Robot from Bondery` (`EMAIL_FROM_DISPLAY_NAME`); `replyTo` / CC are the sender.
