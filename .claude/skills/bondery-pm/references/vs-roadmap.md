# MAIN vs ROADMAP

## What belongs on MAIN

- Bugs, chores, research tasks, refactors, performance tickets
- Security and infra work
- Every PR-scoped or sprint-sized task
- Business ops (tax, legal, compliance prep)
- Internal mirrors of public ROADMAP initiatives (execution breakdown)

## What belongs on ROADMAP

- User-visible initiatives users care about ahead of time
- Community-driven feature areas after curation
- See [bondery-roadmap](../../bondery-roadmap/references/vs-internal-plane.md)

## Linking MAIN ↔ ROADMAP

When a MAIN card implements a public initiative:

1. Include `ROADMAP-n` in the `## Roadmap` description section
2. Link MAIN ↔ ROADMAP with Plane's **relates to** relation (custom relation — not a built-in MCP `relation_type`)
3. Use `Source: Founder` for founder-initiated mirrors; infer Surface from ROADMAP platform label

### MCP linking

`create_work_item_relation` requires `relation_definition_id` + `relation_definition_label` from `list_work_item_relation_definitions`. If that endpoint returns HTTP 402, link manually in the Plane UI (work item → Relations → relates to).

### Pending links (post-migration)

| MAIN work item | ROADMAP |
|----------------|---------|
| `c9976c0e-8bee-414e-bfa8-79c4f7bd149a` | ROADMAP-8 (`e91c1233-5b00-4d4b-b37c-17fc37093c4a`) |
| `9b8294ee-9040-4ce2-82ef-fba09aaca840` | ROADMAP-9 (`4c13a284-694c-4d39-aa58-1d7c159d64aa`) |
| `78c70898-d8c5-433e-b28d-a4dbd75b81dc` | ROADMAP-10 (`ed39b226-c586-4523-a07e-1e2c682e0692`) |

Do not mandate 1:1 mirroring — many public cards have no internal twin until Building starts.

## Distinction from other docs

| Surface | Owns |
|---------|------|
| **MAIN** (this skill) | Internal execution, cycles, sanity checks |
| **ROADMAP** | Future intent and public confidence |
| **Changelog** | Shipped facts and versions |

## vs-roadmap checklist

- [ ] Internal work is on MAIN (`5ab1d2fc-fe39-4adf-af3c-bad0165e151f`)
- [ ] Public-facing intent is on ROADMAP, not duplicated on MAIN title
- [ ] ROADMAP-linked MAIN cards have relation + description section
