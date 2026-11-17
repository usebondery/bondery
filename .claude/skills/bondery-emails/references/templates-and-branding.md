# Templates and branding

## Package structure

```text
packages/emails/
  src/
    shared/
      chrome.ts              # EmailChrome copy, preview clip (90 chars)
      EmailWrapper.tsx       # Header logo, footer help / optional manage + legal
      EmailBody.tsx          # heading → description → contents → CTA → notes
      EmailCta.tsx           # Brand button only (no URL under the button)
      email-styles.ts
      interpolate-named-links.tsx
    fixtures/default-copy.ts # English preview defaults (keep in sync with en JSON)
    templates/
      account/               # Sign-in, welcome, account deleted
      billing/               # Subscriptions / trials
      internal/              # Ops-only (feedback)
      notifications/         # Client-triggered product mail + reminder digest
    index.ts                 # Barrel re-exports for apps/api
```

| Folder | Meaning | Current templates |
|--------|---------|-------------------|
| `account/` | User account create, delete, authentication | `MagicLinkEmail`, `WelcomeEmail`, `AccountDeletedEmail` |
| `billing/` | Subscriptions and billing | `TrialEndingEmail` |
| `internal/` | Visible to the Bondery team, not the end user as the audience | `FeedbackEmail` |
| `notifications/` | User-initiated (or scheduled product) mail from the apps | `ShareContactEmail`, `ReminderDigestEmail` |

Senders in `apps/api` import from the barrel:

```typescript
import { MagicLinkEmail } from "@bondery/emails";
```

Subpath imports (`@bondery/emails/templates/account/MagicLinkEmail`) exist for tooling; prefer the barrel so senders stay stable if a file moves within the same category.

Hash imports inside the package (`#templates/account/MagicLinkEmail.js`) must match the folder.

## EmailWrapper contract

Every template must wrap content in `packages/emails/src/shared/EmailWrapper.tsx`. Body copy goes through `EmailBody` (`heading` → `description` → contents → optional CTA → notes).

| Prop | Purpose |
|------|---------|
| `preview` | **Required.** Inbox snippet (React Email [`<Preview>`](https://react.email/docs/components/preview)) — complements subject, does not duplicate it. Keep **≤90 characters**; `EmailWrapper` clips with `clipEmailPreview`. |
| `title` | Document `<title>` — usually the send subject |
| `lang` / `dir` | Content locale (`en`, `cs`, `de`) and direction |
| `chrome` | Localized header/footer strings (`EmailChrome` namespace) |
| `websiteUrl` | Marketing origin for logo, support, and docs links |
| `showHelp` | Default `true`. Set `false` for internal ops mail (feedback) — help links are replaced by the internal note. |
| `manageNotificationsUrl` | Settings URL for **configurable** product mail only (reminder digest). Omit everywhere else. |
| `showLegalEntity` | Default `false`. Set `true` **only** for promotional/marketing mail (legal name + registered address from `LEGAL_ENTITY`). |
| `children` | Email body |

`EmailWrapper` provides:

- **Font:** Lexend (Google Fonts) + sans-serif fallback
- **Color:** Tailwind `brand` token from `BRAND_PRIMARY_COLOR` (`#a34bcb`)
- **Layout:** White page, 600px column, 36px horizontal padding (`px-9`); logo `mt-9` / `mb-9` (36px above and below)
- **Header:** Always centered, linked `BonderyLogotypeBlack` (160×48) to the marketing origin. Never left-align.
- **Footer:** Help (support + docs) or internal note → optional “Manage these notifications” when `manageNotificationsUrl` is set → legal name and address **only** when `showLegalEntity` is true. See [email-types.md](./email-types.md).

Logo is an inline SVG. Outlook often drops SVG — host a PNG at a stable public URL as a follow-up if Word/Outlook clients become a support issue.

Do **not** add a second logo, left-align the header, or paste legal identity into the template. Legal identity is wrapper-owned and off by default.

## EmailBody / EmailCta

| Slot | Style | Use for |
|------|-------|---------|
| `heading` | 24px bold | One H1; must not clone the CTA label |
| `description` | 16px body | Context paragraph |
| `children` | 16px body unless the block needs its own layout | Lists, fields, extra paragraphs (including a closing thank-you) |
| `cta` | Full-width centered brand button ≥44px | One primary action. `EmailCta` does **not** render the raw URL under the button. Never left-align a pill button. |
| `notes` | 14px muted | Why-receiving, expiry, “reply to reach …” |

API senders pass chrome via `emailDocumentProps(lng, subject)` in `apps/api/src/lib/notifications/email-chrome.ts`.

## Styling rules

- Use React Email components (`Section`, `Heading`, `Text`, `Img`, `Link`).
- Tailwind via `<Tailwind>` with `pixelBasedPreset` is supported — **do not rely on Tailwind alone** for critical layout; many clients strip `<style>`.
- Prefer inline styles on elements that must survive client sanitization.
- Single column; min **16px** body text; notes **14px**; legal footer **12px**.
- Reuse tokens in `email-styles.ts` (`descriptionStyle`, `notesStyle`, `ctaButtonStyle`).

## Brand assets

Import from `@bondery/branding`:

- `BRAND_PRIMARY_COLOR` — accent color
- `BonderyLogotypeBlack` from `@bondery/branding/react` — header logo (owned by `EmailWrapper`)

Do not add one-off images or colors in templates. Legal identity lives in `@bondery/helpers` (`LEGAL_ENTITY`), not branding.

## Product URLs

Pass origins from the API (`BONDERY_PUBLIC_WEBAPP_URL`, `BONDERY_PUBLIC_WEBSITE_URL`) via `emailDocumentProps`. Templates fall back to `https://usebondery.com` and `https://app.usebondery.com` for preview.

Help links: `{websiteUrl}/contact` and `{websiteUrl}/docs`. Digest manage-notifications: `{appOrigin}/app/settings`.

## i18n

Email copy lives in `packages/translations` under `platform/email/` (en / cs / de). Templates accept a `copy` prop; the API loads namespaces via `email-i18n.ts` and passes interpolated strings at send time.

Shared chrome copy: `EmailChrome` namespace. Per-email copy stays in each template namespace.

- Do **not** use `react-i18next` hooks in `@bondery/emails` — senders call templates as functions outside a React tree.
- Preview defaults: `packages/emails/src/fixtures/default-copy.ts` (English).
- Share contact body uses `ShareContactEmailBody` (distinct from mobile `ShareContactEmail` sheet namespace).

## Upstream reference

For generic React Email component patterns, see the upstream `email-best-practices` skill (`.agents/skills/email-best-practices/SKILL.md`).
