# Escalation boundaries

What an agent **may** do vs. what **must** go to a human owner or legal counsel. This skill flags and escalates — it does not certify compliance or finalize contracts.

## Agent MAY (with labels)

| Action | Label | Example |
|--------|-------|---------|
| Propose factual copy fix in Privacy.tsx | **reality-sync** | Replace "Supabase" with "Postgres (self-managed)" in subprocessor table |
| Update subprocessor registry | — | Add GitHub OAuth row with code pointer |
| Update policy-claims-inventory status | — | Mark backup purge `implemented` after job merges |
| File Plane issue for product gap | — | Example: "Add cookie consent banner per Privacy §6" |
| Propose PR description noting disclosure impact | — | "Adds Sentry — requires Privacy §15 update" |
| Read and cite vendor privacy/DPA URLs | — | Link `https://posthog.com/privacy` |

## Agent MUST ESCALATE (do not merge silently)

| Topic | Why | Route to |
|-------|-----|----------|
| Terms of Service finalization | Contractual liability, governing law | Leadership + counsel |
| Retention window wording changes | Legal commitment | Human/counsel |
| GDPR/CCPA rights language | Regulatory text | Human/counsel |
| Liability caps, arbitration, indemnity | Contract | Counsel only |
| Age minimum changes (16 → other) | Legal judgment | Human/counsel |
| DPA / SCC terms for enterprise | Contract | Ops + counsel |
| "We are GDPR/SOC2/ISO compliant" | Compliance certification | **Never** — not agent, not engineer |
| Deleting policy sentences to hide gaps | Worse than the gap | Human — build feature or approved copy change |
| Ambiguous: legal claim vs. engineering fact | Skill cannot adjudicate | Human owner |

## Agent MUST NOT

- Certify regulatory compliance in any artifact
- Fill in `Terms.tsx` placeholder with generated contractual language
- Approve or draft enterprise DPA terms
- Guess what a vendor does with data without citing their policy
- Resolve "is this PII?" or "is consent required?" without human input when unclear
- Remove subprocessor rows from Privacy.tsx without code removal and registry update

## Phrasing discipline

Use in PRs, comments, and drafts:

- "Flag for review"
- "Escalate to [owner]"
- "Reality-sync proposed"
- "Policy-claims gap: [claim] — status unimplemented"

Avoid:

- "Ensures GDPR compliance"
- "Fixes legal issue"
- "Approved by policy"
- "Resolves privacy concern"

## Human owners (defaults)

| Area | Default escalation |
|------|-------------------|
| Privacy Policy factual updates | Engineering + product review |
| Substantive legal wording | `team@usebondery.com` / leadership |
| ToS / contracts | Counsel |
| Enterprise DPA requests | Sales/ops + counsel |
| Product gaps (export, cookie banner) | Engineering via Plane |

## Escalation checklist

- [ ] Fix classified: reality-sync vs. substantive vs. product gap
- [ ] Substantive items tagged for human/counsel — not merged as agent-only
- [ ] No compliance certification language in PR/commit
- [ ] Gaps not hidden by deleting policy text
- [ ] Ambiguity explicitly flagged — not resolved by assumption
