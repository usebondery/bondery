# States and labels

## Public project

| Field | Value |
|-------|-------|
| Identifier | `ROADMAP` |
| UUID | `57a02bb0-fd8a-4f94-8929-64c3f76f4460` |
| View | Kanban board |
| Publish URL | `https://sites.plane.so/issues/8a364296fbbc4c858adeb1952a72a451` |
| First-party URL | `https://usebondery.com/roadmap` (`ROADMAP_URL` in `@bondery/helpers`) |

**Interaction settings:** Allow comments, reactions, and voting — all enabled. Votes inform prioritization discussions; they do not create commitments or auto-promote cards.

## Workflow states

| Plane group | State | Description (Plane state description field) |
|-------------|-------|---------------------------------------------|
| backlog | **Exploring** | We're researching whether and how to build this idea. |
| unstarted | **Planned** | We intend to build this. |
| started | **Building** | We're actively building this now. |
| completed | **Ready for Release** | Built. Coming in an upcoming release. |
| completed | **Released** | This is live in production, see the changelog for details. |
| cancelled | **Not Planned** | Not on our roadmap right now. |

### Transition rules

```
Exploring → Planned → Building → Ready for Release → Released → (groom off board)
     ↑___________|              |            |
     └──────────────────────────┴────────────┘  (delay / pause)
```

- **Under-promise:** if unsure between Planned and Building, choose Planned.
- **Ready for Release:** feature-complete, waiting for changelog cut + deploy — not yet user-visible.
- **Released:** live in production; add changelog link in a comment; groom from default view after ~30 days.
- **Not Planned:** rare, stable out-of-scope answers only.

Resolve state UUIDs via Plane MCP `list_states` when updating cards — names below are canonical.

| State | UUID |
|-------|------|
| Exploring | `c4fbb708-d8cb-4d37-bcf8-557eba29d914` |
| Planned | `b5654f10-2d86-43c4-8c5f-c8dc8aaeb37c` |
| Building | `e6d14f11-9478-46bd-8a0d-a29d49e52bdb` |
| Ready for Release | `7cb30511-a179-472a-90c8-349ed364b4cb` |
| Released | `1f07f190-201b-4a5b-96e4-be603d58dac9` |
| Not Planned | `2bc0f227-fa34-4120-9759-32114a1e04ac` |

## Platform labels

Exactly **one** label required per card. Names must match Plane exactly:

| Label | UUID | Use when |
|-------|------|----------|
| `Mobile` | `fa3b345f-33eb-4616-ac16-c6d7d6d1d5ae` | iOS/Android app only |
| `Webapp` | `d3d13b9c-f1f7-447c-9575-08bc562983cf` | Web application only |
| `Chrome Extension` | `c8426496-bce3-445a-b6de-4eaa5275c6e7` | Browser extension only |
| `API` | `083a1706-4d6b-47bc-a320-e2af63be5333` | Public API surface only |
| `All platforms` | `2346f712-bc0c-4896-beb8-aa56f8e0b5c6` | Ships everywhere or parity is the goal |

Default owner UUID: `fe2bd70b-7756-40cf-b771-c767fc2c3559` (Marek Svitek).

## Required and forbidden fields

| Field | Rule |
|-------|------|
| Owner (assignee) | **Required** on every non-cancelled card |
| Platform label | **Required** — one of the five above |
| Priority | **Leave empty** |
| Target date / calendar date | **Leave empty** |
| Title | Outcome-first, user language |
| Description | See [card-lifecycle.md](card-lifecycle.md) template |

## States and labels checklist

- [ ] Card is on project `57a02bb0-fd8a-4f94-8929-64c3f76f4460`
- [ ] State matches reality within ~1 week
- [ ] Owner assigned
- [ ] Exactly one platform label
- [ ] Priority and target date empty
