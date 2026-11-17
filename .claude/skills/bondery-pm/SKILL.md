---
name: bondery-pm
description: >
  Bondery internal Plane MAIN board — YC-style sanity checks, weekly cycles,
  task naming, states, labels, and solo-founder cadence. Use when creating
  or updating MAIN work items, setting up weekly cycles, processing intake,
  linking to ROADMAP, or grooming the internal kanban.
metadata:
  version: "1.0.0"
  namespace: bondery
---

# Bondery PM

## When to use

- Creating, updating, or grooming cards on the internal Plane **MAIN** project
- Processing intake, running sanity checks, or moving cards through Icebox → Bet → Building
- Setting up weekly cycles (Mon–Sun) and cycle rollover
- Enforcing title prefixes, Source/Surface labels, and description templates
- Linking internal work to public ROADMAP cards
- Release queue → Released handoff with `bondery-release` / `bondery-changelog`

## When not to use

- Public roadmap cards — use `bondery-roadmap`
- Changelog wording or version math — use `bondery-changelog`
- Deploy steps, tags, pins, rollback — use `bondery-release`
- Generic Plane MCP mechanics — use `plane` skill

## Non-negotiables

1. **MAIN project only** — UUID `5ab1d2fc-fe39-4adf-af3c-bad0165e151f` (identifier `MAIN`). Verify `project_id` before any MCP write.
2. Every non–Won't-do card: **owner** + exactly one **Source:** label + exactly one **Surface:** label.
3. Title format: `[Type] Outcome-oriented title` — types: `Bug`, `Chore`, `Feature`, `Research`, `Business Ops`.
4. New cards land in **Inbox** (agents never skip to Building).
5. **Sanity check** required before leaving Inbox — all five questions answered in the `## Sanity check` description section (not triage; not comments).
6. **Blocked** requires a **comment only** (no description section) — state who/what blocks, what is needed, and since when.
7. **Won't do** requires reason comment (minimum one).
8. **Icebox** items older than 60 days → Won't do or refresh (comment + date bump).
9. ROADMAP-linked items: `ROADMAP-n` in description + Plane **relates to** relation to the ROADMAP card (link in UI if MCP `list_work_item_relation_definitions` is unavailable).
10. Weekly cycle cap: **3–5 items** per active cycle (solo founder + agents).
11. Cycles are Mon–Sun; one active cycle at a time.

## Decision tree

| Task | Read |
|------|------|
| States, labels, field rules, UUIDs | [references/states-and-labels.md](references/states-and-labels.md) |
| Title format, description templates | [references/title-and-description.md](references/title-and-description.md) |
| Inbox flow, sanity-check questions | [references/intake-and-sanity-check.md](references/intake-and-sanity-check.md) |
| Weekly cycle setup and rollover | [references/cycles.md](references/cycles.md) |
| MAIN vs ROADMAP boundaries | [references/vs-roadmap.md](references/vs-roadmap.md) |
| Parent tasks and epic splitting | [references/parent-tasks.md](references/parent-tasks.md) |
| Release queue → Released handoff | [references/release-handoff.md](references/release-handoff.md) |
| MCP tool sequences for agents | [references/agent-workflows.md](references/agent-workflows.md) |
| Bulk migration heuristics (audit) | [references/migration-heuristics.md](references/migration-heuristics.md) |
| Public roadmap cards | [`bondery-roadmap`](../bondery-roadmap/SKILL.md) |
| MCP tool usage | [`plane` skill](../plane/SKILL.md) |

Full reference index: [references/README.md](references/README.md).

## PM checklist (before handoff)

- [ ] Card is on MAIN project (`5ab1d2fc-fe39-4adf-af3c-bad0165e151f`)
- [ ] State matches execution reality within ~1 week
- [ ] Owner assigned; exactly one Source + one Surface label
- [ ] Title matches `[Type] Outcome-oriented title`
- [ ] Sanity check complete before leaving Inbox (or legacy footer acknowledged)
- [ ] Blocked items have blocker comment; Won't do has reason comment
- [ ] ROADMAP-linked items have relation + `## Roadmap` section
- [ ] Active cycle has ≤5 committed items
