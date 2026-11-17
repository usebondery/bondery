# Legal entity

Internal registry of the company behind the Bondery product. **Not a public page.** Agents use this when filling vendor forms, invoices, DUNS lookups, or Privacy/Terms controller copy.

Do **not** invent missing identifiers. If a field is unmarked below, ask a human owner.

**Public copy source:** `packages/helpers/src/globals/company.ts` (`LEGAL_ENTITY`). The website re-exports it from `apps/website/src/data/company.ts`. Privacy Policy §2 (Data Controller), marketing Organization JSON-LD, and **marketing** email footers (`showLegalEntity`) read from that object. Transactional product mail does not print legal name/address. Keep those in sync when a **published** identifier changes. DUNS is internal-only today — do not add it to `LEGAL_ENTITY` or Privacy unless a human asks.

Hosted-cloud vs self-host controller split: [self-host-vs-cloud.md](./self-host-vs-cloud.md).

## Recorded

| Field | Value |
|-------|--------|
| Legal name | Sveetech s.r.o. |
| Legal form | s.r.o. (Czech limited-liability company) |
| Brand name | Bondery |
| Registered address | Fryčajova 82/8, 614 00 Brno, Czechia |
| Country | Czechia (CZ) |
| EUID | CZVROR.29902321 |
| VAT ID (DIČ) | CZ29902321 |
| DUNS | 351804152 (Czechia) — **internal; not in Privacy or `LEGAL_ENTITY`** |

## Published contact (already on the website)

| Field | Value | Where |
|-------|--------|--------|
| Support / rights email | `team@usebondery.com` | Privacy §12, Terms draft, `@bondery/helpers` `SUPPORT_EMAIL` |
| Lead supervisory authority | Úřad pro ochranu osobních údajů (ÚOOÚ), Pplk. Sochora 27, 170 00 Praha 7 | Privacy §12 |

`foundingDate: "2026"` is in `LEGAL_ENTITY` for schema.org only. It is **not** confirmed here as the commercial-register incorporation date.

## Not yet recorded

Paste into this file when known. Do not guess.

| Field | Notes |
|-------|--------|
| IČO (company ID) | Czech 8-digit number. VAT `CZ29902321` usually means IČO `29902321`, but this file does not treat that as confirmed. |
| Commercial register | Court (likely Krajský soud v Brně) + file number (oddíl / vložka) |
| Date of incorporation | Commercial-register *den vzniku*, not product launch year |
| Statutory representative | Jednatel / managing director (legal name, not brand nickname) |
| Registered capital | Základní kapitál |
| Phone | If there is a company phone used on invoices or forms |
| Legal-only email | If different from `team@usebondery.com` |
| IBAN / bank | Invoicing only; do not put in public Privacy copy |
| LEI | If registered |
| DPO | Likely none; record explicitly if appointed |

## Agent rules

- Use **legal name** (Sveetech s.r.o.) on contracts, invoices, DPA headers, and Privacy controller blocks. Use **brand name** (Bondery) in product UI.
- Do not copy DUNS into customer-facing pages without a human request.
- Identifier or address change → update this file **and** `LEGAL_ENTITY` in `packages/helpers/src/globals/company.ts` in the same PR if the field is published.
- Jurisdiction, liability, and Terms language stay [escalation-boundaries.md](./escalation-boundaries.md) — this page is identity facts only.
