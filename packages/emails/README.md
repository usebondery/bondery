# @bondery/emails

React Email templates for Bondery transactional mail. Sending happens in `apps/api` — this package is templates only.

## Preview locally

```bash
pnpm run dev:emails
```

Opens the React Email dev server on port **26639**, scanning `src/templates/`.

## Agent skill

Full patterns, catalog, and pre-ship checklist: [`.agents/skills/bondery-emails/SKILL.md`](../../.agents/skills/bondery-emails/SKILL.md)

## Layout

Every template uses shared chrome:

1. **`EmailWrapper`** — centered Bondery logotype, help footer, optional manage-notifications (digest), legal HQ only on marketing
2. **`EmailBody`** — heading → description → contents → optional full-width `EmailCta` → notes

Every template must pass `preview` (inbox snippet, ≤90 characters). Sends include HTML and plaintext.

Do not rebuild header, footer, or CTA. Do not print the destination URL under the button. Do not left-align the logo.

## Folders

| Folder                         | For                                               | Templates                                               |
| ------------------------------ | ------------------------------------------------- | ------------------------------------------------------- |
| `src/templates/account/`       | Sign-in, welcome, account lifecycle               | `MagicLinkEmail`, `WelcomeEmail`, `AccountDeletedEmail` |
| `src/templates/billing/`       | Subscriptions                                     | `TrialEndingEmail`                                      |
| `src/templates/internal/`      | Mail the Bondery team reads                       | `FeedbackEmail`                                         |
| `src/templates/notifications/` | Client-triggered product mail and reminder digest | `ShareContactEmail`, `ReminderDigestEmail`              |

API senders import from the package barrel:

```typescript
import { WelcomeEmail } from "@bondery/emails";
```

Shared pieces live in `src/shared/`. English preview defaults live in `src/fixtures/default-copy.ts` and must stay in sync with `packages/translations` `en` email namespaces.
