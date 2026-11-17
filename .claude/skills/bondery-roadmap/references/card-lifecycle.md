# Card lifecycle

## When to create a public card

Opt-in only. Create a ROADMAP card when:

1. User value can be stated without engineering context
2. Leadership agrees it won't be reversed in ~2 weeks
3. Platform scope is known
4. Item is not competitor-sensitive or legally restricted
5. An owner is assigned for status updates

Do **not** create a card for every internal ticket, bug, patch fix, or dependency bump.

## Project intro (pin in Plane project description)

```markdown
# Bondery Roadmap

This page shows what we're exploring, planning, and building for Bondery —
your personal relationship manager.

**How to read this page**
- **Exploring** — we're researching; not a commitment yet
- **Planned** — we intend to build it
- **Building** — we're building it now
- **Ready for Release** — built; coming in an upcoming release
- **Released** — live; see the [changelog](https://usebondery.com/docs/changelog) for details

**What this is not**
This is direction, not a contract. Priorities and timing change as we learn.
For what already shipped, see the [changelog](https://usebondery.com/docs/changelog).

**Feedback**
Comments and votes help us understand demand. They do not automatically
change priority or add items to the roadmap.

**Language**
The roadmap is published in English. Bondery supports English, Czech, and German in the product.
```

## Title rules

| Rule | Good | Bad |
|------|------|-----|
| Outcome-first | Import contacts from Google on mobile | Google People API phase 2 |
| User language | Snooze a reminder from the notification | Add snooze endpoint |
| Specific | Merge duplicate contacts after import | Better import |
| Short | ≤ 80 characters | Full paragraph as title |

## Description template

```markdown
## What
[1–2 sentences: what will be different for the user. Second person.]

## Why (optional)
[1 sentence — only if not obvious from title.]

## Platform
[Mobile | Webapp | Chrome Extension | API | All platforms]

## Notes (optional)
[Phasing, e.g. "Webapp first; mobile follows." Only if needed.]

## Related
- Released: [Changelog X.Y.Z](url) — only when status = Released
- Docs: [topic](url) — only if concept doc exists
```

## Status copy patterns

| Status | Opening pattern |
|--------|-----------------|
| Exploring | "We're exploring how to …" |
| Planned | "We plan to …" |
| Building | "We're building …" |
| Ready for Release | "Built and scheduled for an upcoming release. …" |
| Released | "Released in [X.Y.Z](changelog-url). …" |
| Not Planned | "Not on our roadmap right now. …" |

## Banned phrases

- "Coming soon" / "Almost done" / "Top priority"
- "We will" / "Guaranteed" / specific dates without owner accountability
- Internal terms: API endpoint names, migrations, refactors, vendor codenames

## Hygiene cadence

| Rhythm | Action |
|--------|--------|
| **Weekly** (15 min) | Status sync; move release-ready items; honest delays |
| **At release** | Ready for Release → Released + changelog link ([release-day.md](release-day.md)) |
| **Monthly** | Groom Released cards off default kanban; cancel stale Exploring |

## Delay / pivot template

```markdown
We're taking longer than expected on [title] while we [user-facing reason].
Status moved to Planned. We'll update this page when work resumes.
```

## Card lifecycle checklist

- [ ] Title passes "would a user understand this?" test
- [ ] Description uses template; no engineering internals
- [ ] Owner and platform label set
- [ ] Status is honest
- [ ] Roadmap owner approved before first publish
