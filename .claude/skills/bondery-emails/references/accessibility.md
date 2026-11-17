# Accessibility

Email accessibility benefits screen readers, mobile readers, and AI assistants that summarize inbox content.

## Structural defaults (React Email)

Keep `@react-email/components` up to date — recent versions improve defaults:

- `lang` and `dir` on `<html>`
- `role="presentation"` on layout tables
- Sensible `alt` defaults on `<Img>`

Verify version in `packages/emails/package.json` after upgrades.

## Content checklist

Apply on every template change:

| Check | Rule |
|-------|------|
| Headings | One `h1`, nested in order (`h2` → `h3`); short notifications may omit headings |
| Link text | Descriptive ("Manage subscription") — never "click here" |
| Alt text | Meaningful for content images; `alt=""` for decorative only |
| Contrast | Body text ≥ 4.5:1 against background; preview in dark mode |
| Title | `<title>` describes email content (React Email `Head`) |
| Language | `lang` matches content locale (English today: `en`) |

## Plain-text part

Every send is `multipart/alternative`: HTML plus plaintext. API senders call `renderEmailParts` (`render` then [`toPlainText`](https://react.email/docs/utilities/render#4-convert-to-plain-text)).

Use `data-skip-in-text="true"` only on decorative HTML you want omitted from plaintext. Do **not** put it on the header logo. Do not skip the CTA, body copy, or preference/help links.

## Testing

- React Email preview for structure
- Screen reader spot-check for new templates (VoiceOver on macOS/iOS)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) for custom colors

## External references

- [Resend: 6 tips for accessible emails](https://resend.com/blog/6-tips-for-accessible-emails)
- Upstream `email-best-practices` skill for React Email patterns
