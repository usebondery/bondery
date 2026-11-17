# Transactional vs marketing email (product policy)

> **Not a compliance certification.** This file records how Bondery classifies product mail today and what agents should (and should not) put in templates. It does not assert that Bondery is “CAN-SPAM compliant” or “GDPR compliant.” Substantive legal wording stays [escalation-boundaries.md](./escalation-boundaries.md). Flag for counsel if we add marketing mail or if a message’s primary purpose is unclear.

Cross-skill implementation: [bondery-emails](../../bondery-emails/SKILL.md) → `references/email-types.md`.

## What we send today

Everything in `@bondery/emails` is **transactional, user-initiated, a reminder digest the user turned on, or internal ops**. We do **not** send newsletters, product-update blasts, or promotions.

| Kind | Examples | Marketing? |
|------|----------|------------|
| Account / auth | Sign-in link, welcome, account deleted | No |
| Billing | Trial ending | No |
| In-app notification | Reminder digest (user enabled those dates) | No |
| User-initiated to a third party | Share contact | No |
| Internal | Feedback to the Bondery team | No |

If a proposed email is a newsletter, launch announcement, upsell, or “here’s what’s new,” **stop** — that is marketing. Do not reuse transactional chrome. Escalate to a human owner before building.

## Unsubscribe vs “manage notifications”

Typical framing (confirm with counsel for new types; do not treat as a legal opinion):

| Regime | Marketing (newsletters, promotions, product updates) | Transactional / relationship (account, auth, billing, requested service messages) |
|--------|------------------------------------------------------|-------------------------------------------------------------------------------------|
| US CAN-SPAM | Commercial email generally needs a working opt-out and related identification | Messages whose *primary purpose* is transactional or relationship are not treated as commercial email for those extra requirements |
| EU ePrivacy + GDPR | Electronic mail for direct marketing generally needs a prior opt-in (member-state details vary; existing-customer “soft opt-in” is not universal) | Mail needed to perform a contract or a user-requested service is not direct marketing |

**Working product rules:**

- Do **not** put a marketing unsubscribe link or `List-Unsubscribe` header on current product mail.
- **Do** keep “Manage these notifications” + a Settings URL on **configurable** product mail (today: reminder digest). People turn reminders off in the app. That footer is a product preference link, not a commercial opt-out.
- Do **not** put “Manage these notifications” on auth, billing, welcome, account-deleted, internal ops, or **share-contact** (third parties have no Bondery account).

When (and only when) we add real marketing mail: build a preference center, document it here and in Privacy, and escalate copy/headers to counsel.

## Physical postal address in the footer

**Working product rule:** show `LEGAL_ENTITY` legal name + registered address **only on promotional / marketing** mail (`showLegalEntity` on `EmailWrapper`). Transactional and product mail does **not** include HQ or the legal company name.

That is a **product choice**, not a claim that every message is legally required (or forbidden) to include a postal address.

Typical framing (again, not a certification):

| Regime | When a postal address is commonly required |
|--------|--------------------------------------------|
| US CAN-SPAM | Commercial / marketing email — a valid physical postal address |
| EU | No single “address in every email” rule equivalent to CAN-SPAM; sender identification and (for marketing) marketing rules still apply. Some member states have extra business-letterhead / Impressum norms |

**Do not add** legal name/address to transactional templates “to be safe.” **Do not add** marketing mail that omits identification counsel would expect.

**Self-host gap:** when marketing mail eventually prints `LEGAL_ENTITY`, it is still Sveetech / Bondery. That is correct for Bondery-operated cloud. It is **wrong** as the operator’s identity on a self-hosted instance. Do not imply the hosted Privacy Policy or Sveetech address applies to self-host — [self-host-vs-cloud.md](./self-host-vs-cloud.md). White-label legal identity is not implemented.

## Agent rules

- Classify every new template in [bondery-emails email-types.md](../../bondery-emails/references/email-types.md).
- Do not add a marketing unsubscribe to transactional mail “to be safe.”
- Do not drop the digest “Manage these notifications” link.
- Do not show legal name/address on transactional / product mail.
- Do not write “CAN-SPAM/GDPR compliant” in PRs, commits, or UI.
- New ESP or marketing program → [subprocessor-registry.md](./subprocessor-registry.md) + Privacy reality-sync or escalate.
