# Public vs internal Plane

## What belongs on ROADMAP

- User-visible initiatives users care about ahead of time
- Exploration of major product directions (Exploring)
- Community-driven feature areas after curation

## What stays internal

- Bugs, spikes, refactors, performance tickets
- Security and infra work (unless user-visible outcome)
- Every PR or sprint task
- Competitor-sensitive or legally restricted work
- Dependency bumps and patch fixes (changelog only when shipped)

## No 1:1 mirroring (v1)

Do not mandate an internal ticket for every public card or vice versa. Many public items start from community feedback without an internal twin. Optional: link internal epic ID in a private comment when useful.

## Internal execution

For bugs, chores, weekly cycles, sanity checks, and internal kanban hygiene, use **[bondery-pm](../../bondery-pm/SKILL.md)** — the MAIN project counterpart to this skill.

## Distinction from other docs

| Surface | Owns |
|---------|------|
| **ROADMAP** (this skill) | Future intent and confidence |
| **MAIN** (`bondery-pm`) | Internal execution, cycles, task breakdown |
| **Changelog** | Shipped facts and versions |
| **bondery-legal long-term-roadmap** | Compliance evolution, manifest, policy claims |

Cross-link legal initiatives on ROADMAP only when user-visible; legal skill owns disclosure accuracy.

## Anti-patterns

- Publishing the internal Plane project
- Auto-sync internal ↔ public in v1
- Public voting that promises prioritization
- Dates or priority fields "for internal use only" on public cards
- Silent deletes when priorities change — update status or add a brief comment

## vs-internal checklist

- [ ] Item is user-visible and safe to share publicly
- [ ] Not duplicating changelog history as a long Released graveyard
- [ ] Internal project UUID verified before any MCP write (must be ROADMAP)
