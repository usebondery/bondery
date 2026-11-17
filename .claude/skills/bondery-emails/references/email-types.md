# Email types

Classification affects legal requirements and deliverability expectations. Policy owner: [bondery-legal emails](../../bondery-legal/references/emails.md). This page is the implementation contract for `@bondery/emails`.

**Not a compliance certification.** Do not write “CAN-SPAM/GDPR compliant” in code or PRs.

## Types in Bondery today

All current mail is transactional, user-initiated, a user-enabled reminder digest, or internal ops. **None of it is marketing.**

| Type | Template folder | Examples | Manage notifications? | Legal name + HQ address? |
|------|-----------------|----------|------------------------|--------------------------|
| **Transactional / product** | `account/`, `billing/` | Sign-in link, welcome, account deleted, trial ending | No | No (`showLegalEntity` default) |
| **User-initiated to a third party** | `notifications/` (share) | Share contact | No — recipient has no Bondery account | No |
| **Configurable product mail** | `notifications/` | Reminder digest (user turned on those dates) | **Yes** — `manageNotificationsUrl` → Settings | No |
| **Internal ops** | `internal/` | Feedback to ops inbox | No | No |
| **Promotional / marketing** | none yet | Newsletters, launches, upsells | Preference center (not built) | **Yes** — `showLegalEntity` |

## Manage notifications vs marketing unsubscribe

Keep **“Manage these notifications”** + Settings on mail the user can turn off in the product (today: reminder digest). That is a **product preference** link, not CAN-SPAM / ePrivacy commercial opt-out.

Do **not** put a marketing unsubscribe, `List-Unsubscribe`, or “Manage these notifications” on:

- Auth, welcome, account deleted, trial ending (the product working, not a list they joined)
- Share-contact recipients (no Bondery account — “manage in Bondery” is nonsense)
- Internal ops mail

When we add marketing mail, stop and follow [bondery-legal emails](../../bondery-legal/references/emails.md) (preference center + counsel). Do not reuse transactional chrome with a bolted-on unsubscribe.

## Postal address / company name

`EmailWrapper` hides `LEGAL_ENTITY` legal name and registered address unless `showLegalEntity` is **true**.

That flag is for **promotional / marketing** mail only. Transactional and product mail (everything we send today) does **not** show HQ or the legal company name. US CAN-SPAM’s postal-address requirement is aimed at **commercial** email — this is a product rule, not a claim that transactional mail is legally required (or forbidden) to include an address.

When (and only when) we add marketing: set `showLegalEntity` and escalate copy to counsel. Self-host still has no operator identity override — known gap; see the legal note.

## What we do not send

- Marketing newsletters or promotional broadcasts
- Password reset (no password login)
- Cold outreach

## Legal escalation

Coordinate with [bondery-legal](../../bondery-legal/SKILL.md) when:

- Adding a new email type that could be construed as marketing
- Adding a new ESP or changing data sent to Plunk
- Adding unsubscribe, `List-Unsubscribe`, or a preference center
- Turning `showLegalEntity` on for the first marketing template

## No-reply policy

Do not use `no-reply@` From addresses. Use reply-capable addresses and set `replyTo` when the user should respond (share contact, feedback).

## Tracking

No link or open tracking on transactional emails — improves deliverability and trust. See [deliverability.md](./deliverability.md).
