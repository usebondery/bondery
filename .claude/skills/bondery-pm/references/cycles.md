# Weekly cycles

Cycles are the weekly commitment container (Mon–Sun). State = execution progress. No duplicate "This week" column.

**Cap:** 3–5 items per active cycle (solo founder + agents).

**First cycle note:** `Week of 2026-08-04` exists but starts **empty** (migration seed was cleared). Add 3–5 items from Bet for Next Cycle when you commit the week.

## Set up new cycle

Triggered when user says *"set up a new cycle"* or at the start of each week:

1. `list_cycles` on MAIN → find current cycle (`status: current`); `complete_cycle` if one exists.
2. Compute Mon 00:00 – Sun 23:59 (project timezone UTC, or user TZ if specified).
3. `create_cycle` — name: `Week of YYYY-MM-DD` (Monday date), `owned_by`: `fe2bd70b-7756-40cf-b771-c767fc2c3559`.
4. `list_work_items` where `state = Bet for Next Cycle` → `manage_cycle_work_items` add to new cycle; move each to **Bet** state.
5. From previous cycle: `list_cycle_work_items` where state in (`Building`, `Blocked`) → roll over via `transfer_cycle_work_items` or add + keep state.
6. Warn if cycle has >5 items; ask founder to drop lowest priority.
7. Post cycle summary comment listing committed items.

### MCP sequence (example)

```
list_cycles(project_id=MAIN)
complete_cycle(...)           # if current exists
create_cycle(name="Week of 2026-08-04", start_date=..., end_date=..., owned_by=...)
list_work_items(pql='state = "<Bet for Next Cycle UUID>"')
manage_cycle_work_items(cycle_id=..., add_work_item_ids=[...])
update_work_item(state=Bet)   # for each pulled item
transfer_cycle_work_items(...) # rollover Building/Blocked from prior cycle
```

## Rollover rules

| Prior state | Action |
|-------------|--------|
| Building | Carry to new cycle, keep Building |
| Blocked | Carry to new cycle, keep Blocked |
| Bet (unfinished) | Founder decides: roll or demote to Icebox |
| Release queue / Released | Do not add to new cycle |

## Cycle checklist

- [ ] Only one active cycle at a time
- [ ] Cycle name uses Monday date: `Week of YYYY-MM-DD`
- [ ] ≤5 items committed
- [ ] Bet for Next Cycle items pulled and moved to Bet
- [ ] Building/Blocked items rolled over from prior cycle
