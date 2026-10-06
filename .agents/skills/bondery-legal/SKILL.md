---
name: bondery-legal
description: >
  Bondery legal disclosure hygiene — subprocessor registry, policy-claims reconciliation,
  data-flow triggers, legal-entity identity, and escalation boundaries. Use when adding
  third-party vendors/SDKs, new data collection, analytics, AI tools, retention/deletion,
  editing Privacy/Terms, looking up Sveetech / Bondery company identifiers
  (VAT, EUID, DUNS, registered address), or classifying product email as
  transactional vs marketing (unsubscribe, postal address).
metadata:
  version: "1.0.0"
  namespace: bondery
---

# Bondery Legal

> **This skill reconciles product behavior with published legal claims.** It does not certify regulatory compliance, draft final contractual language, or replace legal counsel. When in doubt, **flag and escalate** to a human owner.

## When to use

- Adding a new third-party SDK, API client, or npm dependency that sends data off-platform
- Adding or changing a data-collecting feature (new PII field, tracking event, AI tool call, webhook)
- Touching account deletion, backup, retention, or log-anonymization code
- Touching analytics opt-out, cookie behavior, or `DO_NOT_TRACK`
- Editing `apps/website/src/components/legal/Privacy.tsx` or `Terms.tsx`
- Looking up or changing Sveetech / Bondery legal identity (VAT, EUID, DUNS, address)
- Classifying product email as transactional vs marketing (unsubscribe, postal address in the footer)
- Reviewing a PR that touches any of the above

Do **not** activate for routine UI refactors, API contract work, or technical security enforcement — use `bondery-api`, `bondery-ux`, or `bondery-security` instead.

Do **not** restyle Privacy, Terms, or policy claims with `bondery-writing`. Legal wording stays as published.

## Reconciliation workflow

1. **Classify the change** — does it add/remove a vendor, add/remove a data category, or change retention/consent behavior? If none, skip this skill.
2. **Check the subprocessor registry** — [references/subprocessor-registry.md](references/subprocessor-registry.md). New vendor not listed → blocking flag.
3. **Check the policy claims inventory** — [references/policy-claims-inventory.md](references/policy-claims-inventory.md). Does the change satisfy, contradict, or leave orphaned a claim in `Privacy.tsx` / `Terms.tsx`?
4. **Classify the fix:**
   - *Factual correction* (wrong vendor name, feature now exists) → agent may propose copy diff, labeled **reality-sync**
   - *Substantive legal claim* (retention window, rights language, liability, jurisdiction) → draft suggestion only; tag for human/counsel sign-off
5. **Update the registry** in the same PR as the vendor/data-flow change.
6. Complete the legal checklist before merge.

Full workflow with examples: [references/data-flow-workflow.md](references/data-flow-workflow.md).

## Non-negotiables (ranked)

1. **Never assert regulatory compliance** — no "GDPR/CCPA/SOC2 compliant" in code, commits, PR descriptions, or docs
2. **New off-platform vendor** sending user or contact PII must be checked against the subprocessor registry before merge — undeclared vendor is a **blocking flag**
3. **Never edit substantive legal wording unsupervised** — retention commitments, rights language, liability, jurisdiction, age minimums require human/counsel review; factual corrections (wrong vendor name) may be proposed as **reality-sync** only
4. **New data-collecting features** must be checked against existing policy claims — do not ship silently when claims would be contradicted or left orphaned
5. **Self-host ≠ cloud** — never imply the hosted Privacy Policy's subprocessors or retention commitments apply to a self-hosted deployment ([references/self-host-vs-cloud.md](references/self-host-vs-cloud.md))
6. **Retention/deletion claims must trace to code** — flag numeric claims (30-day backup purge, 90-day IP logs) with no enforcing job as **gaps**, not assumed targets
7. **AI scope must not silently expand** — disclosed use is "only when you message the AI Assistant"; new LLM paths sending contact PII require policy update
8. **Never guess vendor data practices** — cite the vendor's own privacy policy or DPA URL
9. **Escalate ambiguity** — surface the question to a human owner; do not adjudicate

Escalation rules: [references/escalation-boundaries.md](references/escalation-boundaries.md).

## Legal document locations

| Document | Path | Status |
|----------|------|--------|
| Privacy Policy | `apps/website/src/components/legal/Privacy.tsx` | Published (last updated August 18, 2026) |
| Terms of Service | `apps/website/src/components/legal/Terms.tsx` | **Draft placeholder** — not final contractual terms |
| Layout helper | `apps/website/src/components/legal/shared/LegalDocumentLayout.tsx` | — |
| Routes | `apps/website/src/app/(marketing)/(legal)/{privacy,terms}/page.tsx` | — |
| App links | Webapp login, mobile settings/legal | External links to website URLs |

No `docs/legal/` folder. Legal copy is English-only React components on the website.

## Decision tree

| Task | Read |
|------|------|
| Company identity (name, address, VAT, EUID, DUNS) | [references/legal-entity.md](references/legal-entity.md) |
| Product email (transactional vs marketing, unsubscribe, postal address) | [references/emails.md](references/emails.md) and [bondery-emails](../bondery-emails/SKILL.md) |
| Vendor / subprocessor list (code-grounded) | [references/subprocessor-registry.md](references/subprocessor-registry.md) |
| Policy claim vs. code status | [references/policy-claims-inventory.md](references/policy-claims-inventory.md) |
| Trigger → action workflow | [references/data-flow-workflow.md](references/data-flow-workflow.md) |
| Self-host vs. cloud obligations | [references/self-host-vs-cloud.md](references/self-host-vs-cloud.md) |
| What agent may draft vs. must escalate | [references/escalation-boundaries.md](references/escalation-boundaries.md) |
| Future: manifest, CI, roadmap | [references/long-term-roadmap.md](references/long-term-roadmap.md) |

Full index: [references/README.md](references/README.md).

Cross-skill owners: technical enforcement → `bondery-security`; API contracts → `bondery-api`; UI/copy display → `bondery-ux`; product email chrome → `bondery-emails`; English registers → `bondery-writing` (do not restyle legal claims).

## Legal checklist (before merge)

- [ ] New product email classified transactional vs marketing ([emails.md](references/emails.md)) — legal HQ only on marketing; “Manage these notifications” only on configurable product mail (digest)
- [ ] Change classified: vendor / data category / retention / consent / policy copy
- [ ] Subprocessor registry checked — new vendor added or `policy-sync` status updated in same PR
- [ ] Policy claims inventory checked — no silent contradiction with `Privacy.tsx` / `Terms.tsx`
- [ ] Fix classified: **reality-sync** (factual) vs. **escalate** (substantive legal wording)
- [ ] No regulatory compliance assertions in code, commits, or PR text
- [ ] Self-host vs. cloud context considered if deploy/docs touched
- [ ] AI data flows stay within disclosed "message the AI Assistant" boundary
- [ ] Vendor privacy/DPA URL cited — not inferred
- [ ] Ambiguity flagged to human owner — not resolved by agent alone
