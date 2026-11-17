# Title and description

## Title format

```
^\[(Bug|Chore|Feature|Research|Business Ops)\] .+
```

**Outcome over component** — bad: `[Feature] Export button`. Good: `[Feature] Let users bulk-export cycle reports as CSV`.

Titles should mirror the `## Outcome` sentence in the description. When the Outcome is still a label (e.g. `LLC`, `Overview`), groom the Outcome first, then retitle.

### Examples

| Type | Example |
|------|---------|
| Bug | `[Bug] Fix avatar upload failing on slow connections` |
| Chore | `[Chore] Upgrade Redis to v8 for connection pooling` |
| Feature | `[Feature] Let users bulk-export contacts as CSV` |
| Research | `[Research] Evaluate Prisma 8 migration path` |
| Business Ops | `[Business Ops] File annual tax return for Sveetech s.r.o.` |

## Standard task description

```markdown
## Outcome
[What changes for the user or operator — one sentence]

## Sanity check
- **Who is the user?** [persona or operator/founder]
- **What pain or opportunity?** [one sentence]
- **How do we know?** [support, churn, usage, founder, ROADMAP vote, agent, analytics, …]
- **Smallest shippable slice:** [this week's slice, or "not this week"]
- **How will we know it worked?** [metric, qualitative signal, or "unblocks X"]

## Roadmap
[Optional] ROADMAP-n — [title]. Link: https://usebondery.com/roadmap
```

## Blocked state

Do **not** add a `## Blocked` section to the description. Post a **comment** when moving to Blocked:

```
Blocked: [who/what] — need [what unblocks]. Since YYYY-MM-DD.
```

Update or resolve via comment when unblocked.

## Won't do

Post a reason comment (minimum one sentence) when moving to Won't do.

## Legacy migration footer

Migrated cards without a complete sanity check get this footer until groomed:

```markdown
> Legacy migration — sanity check pending review
```

## Title and description checklist

- [ ] Title matches regex with valid type prefix
- [ ] Outcome is user/operator-facing, not component jargon
- [ ] Sanity check section complete before leaving Inbox
- [ ] Blocked/Won't do use comments, not description sections
