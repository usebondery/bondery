# States and labels

## Internal project

| Field | Value |
|-------|-------|
| Identifier | `MAIN` |
| UUID | `5ab1d2fc-fe39-4adf-af3c-bad0165e151f` |
| View | Kanban board + cycles |
| Timezone | UTC (cycles Mon–Sun) |

Default owner UUID: `fe2bd70b-7756-40cf-b771-c767fc2c3559` (Marek Svitek).

## Workflow states

| Plane group | State | Description |
|-------------|-------|-------------|
| backlog | **Inbox** | Raw ideas awaiting sanity check |
| backlog | **Icebox** | Valid work, not now — reviewed but deferred |
| unstarted | **Bet** | Reviewed and roughly scoped; may enter a weekly cycle |
| unstarted | **Bet for Next Cycle** | Queued for next weekly cycle (Mon–Sun) |
| started | **Building** | Actively worked in the active cycle |
| started | **Blocked** | Blocked by external party — blocker details in comments only |
| completed | **Release queue** | Finished; waiting for release and changelog mention |
| completed | **Released** | Shipped and archived |
| cancelled | **Won't do** | Declined — reason required in comments |

### Transition rules

```
Inbox → (sanity check) → Icebox | Bet | Bet for Next Cycle
Bet for Next Cycle → (cycle setup Mon) → Bet → Building
Building → Release queue → Released
Icebox → Bet (when prioritized) | Won't do (stale 60d+)
Blocked → Building (when unblocked, via comment)
```

Resolve state UUIDs via Plane MCP `list_states` when updating cards — names below are canonical.

| State | UUID |
|-------|------|
| Inbox | `94a37b5a-efab-4a97-ad54-bb175fbd5423` |
| Icebox | `dfe776d8-97de-4fdd-8d47-380db2c407a7` |
| Bet | `a78477d7-bcc0-4659-879f-a640e5c36008` |
| Bet for Next Cycle | `fcbaa781-5998-404b-b212-4d7e2cc30cb6` |
| Building | `e4b710f8-c9d0-410a-82e6-08223d5c2d5e` |
| Blocked | `e056ac17-2981-41d2-bb8d-67d0c23793e8` |
| Release queue | `446b1f35-c481-486d-8c2f-eb76fdd42ad9` |
| Released | `33044163-08ad-40da-b032-691ce60e02a6` |
| Won't do | `76b82d71-b89e-4b4c-b8c5-9abcf3bea31b` |

## Source labels

Exactly **one** Source label required per card:

| Label | UUID |
|-------|------|
| `Source: Founder` | `4a81add8-d169-4f90-8759-eabdcb29481c` |
| `Source: Users` | `566adc26-175e-4539-a7a3-15814fa5a7de` |
| `Source: Agents` | `80e5965e-359e-49db-99ff-b6de28476998` |

## Surface labels

Exactly **one** Surface label required per card:

| Label | UUID | Use when |
|-------|------|----------|
| `Surface: Mobile` | `f50f8778-0427-435f-b49c-84b3e100bf2d` | iOS/Android app |
| `Surface: Webapp` | `1e7f2400-14a6-49a4-8dc2-5c88a49e0ed4` | Web application |
| `Surface: Chrome Extension` | `8122d619-2131-4ef0-bf7f-4cdf7218be3a` | Browser extension |
| `Surface: API` | `d2ea6a28-97e4-4e52-9092-85a2554c0560` | API / backend surface |
| `Surface: All platforms` | `e89938ef-2c7f-4788-b668-83af5f8fdb4f` | Cross-platform parity |
| `Surface: Infra` | `f6e6fcff-5266-4eed-b3fb-3e628ee53713` | Deploy, CI, deps, ops |
| `Surface: Docs` | `071084c0-f850-4e70-bd97-55a989f4b9b1` | Documentation only |

## Required and forbidden fields

| Field | Rule |
|-------|------|
| Owner (assignee) | **Required** on every non–Won't-do card |
| Source label | **Required** — one of three above |
| Surface label | **Required** — one of seven above |
| Priority | **Leave empty** unless urgent exception |
| Target date | **Leave empty** — cycles replace date commitments |
| Title | `[Type] Outcome-oriented title` — see [title-and-description.md](title-and-description.md) |

## States and labels checklist

- [ ] Card is on project `5ab1d2fc-fe39-4adf-af3c-bad0165e151f`
- [ ] State matches execution reality
- [ ] Owner assigned
- [ ] Exactly one Source + one Surface label
- [ ] Title has valid type prefix
