# Parent tasks

Use parent/child nesting when work is too large for a single weekly cycle slice.

## When to split

- ROADMAP mirror cards spanning multiple releases
- Multi-file descriptions listing distinct deliverables
- Former `➕ big features` items that are clearly epics

## Pattern

| Role | State | Title |
|------|-------|-------|
| Parent | **Bet** | `[Feature] <outcome>` |
| Child slice | **Icebox** or **Bet for Next Cycle** | `[Feature] <scoped slice>` |

Set `parent` on child via `update_work_item` or `create_work_item`.

## Do not auto-split

Groom epics manually during weekly review. Flag ~10–15 obvious epics; document the rest for founder review.

## Parent tasks checklist

- [ ] Parent title is outcome-oriented, not a bucket label
- [ ] Each child is shippable within one cycle
- [ ] Children have their own Source + Surface labels
