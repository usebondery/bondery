# Data-flow workflow

Step-by-step loop for reconciling code changes with legal disclosures.

## Loop

```
Change → Classify → Check registry → Check claims → Classify fix → Update registry → Checklist
```

### 1. Classify the change

| Type | Examples | Skill applies? |
|------|----------|----------------|
| New vendor / SDK | Add Sentry, new email ESP | Yes |
| New data category | New profile field synced to mobile | Yes |
| New tracking event | PostHog `captureEvent` with new properties | Yes |
| New AI / LLM path | Background summarization calling Anthropic | Yes |
| Retention / deletion | Backup job, log TTL, account delete cascade | Yes |
| Consent / cookies | Cookie banner, analytics toggle | Yes |
| Policy copy edit | `Privacy.tsx` wording | Yes |
| Routine refactor | Rename internal function | No |

### 2. Check subprocessor registry

Open [subprocessor-registry.md](./subprocessor-registry.md).

- Vendor already listed with `in-sync` → proceed
- Vendor listed `drifted` → note; may need Privacy.tsx reality-sync
- **Vendor not listed** → **blocking flag**; add row with `undisclosed` before merge

### 3. Check policy claims inventory

Open [policy-claims-inventory.md](./policy-claims-inventory.md).

Ask: Does this change **satisfy**, **contradict**, or **orphan** a published claim?

Examples:
- Adding analytics toggle → satisfies "disable in account settings" (`unimplemented` → `implemented`)
- Adding PostHog event with email property → contradicts "no PII in analytics" engineering norm
- Shipping without cookie banner → leaves cookie §6 claims orphaned

### 4. Classify the fix

| Fix type | Agent may | Requires |
|----------|-----------|----------|
| **Reality-sync** | Propose Privacy.tsx factual update (vendor name, feature now exists) | PR label; human review |
| **Product gap** | File issue / Plane task to build missing feature | Engineering |
| **Substantive legal** | Draft suggestion only | Human/counsel sign-off |
| **Escalate** | Flag ambiguity | Human owner |

See [escalation-boundaries.md](./escalation-boundaries.md).

### 5. Update registry

Same PR as the code change — add or update the vendor row and `policy-sync` status.

### 6. Complete legal checklist

`SKILL.md` → Legal checklist (before merge).

---

## Worked examples

### Example A: Adding a new error-tracking SDK (e.g. Sentry)

1. **Classify:** New vendor sending errors (may include PII in stack traces).
2. **Registry:** No Sentry row → add with `undisclosed`, data categories: stack traces, URLs, user IDs if configured.
3. **Claims:** Privacy §15 subprocessors — new row needed. Check PII in logs (`bondery-security` redaction gap).
4. **Fix:** Reality-sync for Privacy.tsx table + escalate if DPA/SCC review needed.
5. **Registry:** Update `policy-sync` after Privacy PR merged.
6. **Security:** Configure scrubbing before merge (`bondery-security`).

### Example B: New AI feature — auto-summarize contact notes

1. **Classify:** New AI/LLM path; contact PII to Anthropic outside user-initiated chat.
2. **Registry:** Anthropic already listed — but **use case expands**.
3. **Claims:** Privacy §15 Anthropic notes: "only when you send a message to the AI Assistant" — **contradicted**.
4. **Fix:** **Substantive legal** — escalate Privacy wording update; do not ship without disclosure review.
5. **Security:** Zod-validate inputs; user-scoped context (`bondery-security`).

### Example C: Implementing backup purge job (30 days)

1. **Classify:** Retention/deletion behavior change.
2. **Registry:** No new vendor.
3. **Claims:** Privacy §8 "backups purged within 30 days" — status `unimplemented` → can move to `implemented` after job ships.
4. **Fix:** Reality-sync — update [policy-claims-inventory.md](./policy-claims-inventory.md) in same PR.
5. **Document:** Job schedule, what is purged, evidence in PR description.

---

## Workflow checklist

- [ ] Change classified (vendor / data / retention / consent / policy)
- [ ] Registry checked; row added or updated
- [ ] Claims inventory checked for satisfy/contradict/orphan
- [ ] Fix type chosen (reality-sync / product gap / substantive / escalate)
- [ ] Registry and inventory updated in same PR where applicable
- [ ] Legal checklist in SKILL.md completed
