---
name: bondery-roadmap
description: >
  Bondery public Plane roadmap — ROADMAP project states, labels, card lifecycle,
  release-day transitions, and public URL. Use when creating or updating public
  roadmap cards, moving items to Ready for Release or Released, grooming the
  Plane publish board, or linking roadmap from docs, website, or release workflow.
metadata:
  version: "1.0.0"
  namespace: bondery
---

# Bondery Roadmap

## When to use

- Creating, updating, or grooming cards on the public Plane **ROADMAP** project
- Moving cards through Exploring → Planned → Building → Ready for Release → Released
- Release-day roadmap hygiene (after changelog cut and deploy smoke)
- Adding or reviewing links to the public roadmap from docs, website, or README
- Deciding whether work belongs on the public board vs internal Plane or changelog

## When not to use

- Changelog wording or version math — use `bondery-changelog`
- Deploy steps, tags, pins, rollback — use `bondery-release`
- Generic Plane MCP mechanics — use `plane` skill
- Legal/compliance evolution tracking — use `bondery-legal` → `long-term-roadmap.md`

## Non-negotiables

1. **Public project only** — UUID `57a02bb0-fd8a-4f94-8929-64c3f76f4460` (identifier `ROADMAP`). Verify `project_id` before any MCP write.
2. **Every card:** owner required, exactly one platform label; **priority empty**, **target date empty**.
3. **One card = one user-visible initiative** — not a PR, bug, spike, or internal ticket.
4. **Votes, comments, and reactions are signal, not priority** — no auto-promotion from votes.
5. **Two `completed` states are intentional** — Ready for Release, then Released.
6. **Changelog is canonical for shipped history** — Released cards get a changelog link comment, then groom off the default board view.
7. **Public links use** `ROADMAP_URL` (`https://usebondery.com/roadmap`) — never the raw Plane publish URL in user-facing copy.

## Decision tree

| Task | Read |
|------|------|
| States, labels, field rules | [references/states-and-labels.md](references/states-and-labels.md) |
| Card creation, copy templates | [references/card-lifecycle.md](references/card-lifecycle.md) |
| Release-day state transitions | [references/release-day.md](references/release-day.md) |
| Public URL, footer, docs links | [references/public-url-and-links.md](references/public-url-and-links.md) |
| What never goes on ROADMAP | [references/vs-internal-plane.md](references/vs-internal-plane.md) |
| MCP tool usage | [`plane` skill](../plane/SKILL.md) |
| Changelog cut | [`bondery-changelog`](../bondery-changelog/SKILL.md) |
| Deploy / smoke gate | [`bondery-release`](../bondery-release/SKILL.md) |

Full reference index: [references/README.md](references/README.md).

## Roadmap checklist (before handoff)

- [ ] Card is on ROADMAP project (`57a02bb0-fd8a-4f94-8929-64c3f76f4460`)
- [ ] Owner assigned; exactly one platform label set
- [ ] Priority and target date left empty
- [ ] Title is outcome-first user language (not engineering jargon)
- [ ] Status is honest (default to Exploring or Planned when unsure)
- [ ] Release-day: in-release cards moved Ready for Release → Released with changelog link after smoke
- [ ] Released cards older than ~30 days groomed from default kanban view
- [ ] Public links use `ROADMAP_URL`, not raw Plane URL
