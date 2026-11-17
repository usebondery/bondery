# Migration heuristics

One-time rules used for bulk MAIN board migration (Aug 2026). Kept for audit.

## State map

| Old state | New state |
|-----------|-----------|
| Backlog | **Inbox** if created in last 7 days with empty description; else **Icebox** |
| Todo | **Bet for Next Cycle** |
| In Progress | **Building** |
| Waiting on external party | **Blocked** |
| To be released | **Release queue** |
| Done & archived | **Released** |
| Cancelled | **Won't do** |

## Title prefix heuristics

| Signal | Prefix |
|--------|--------|
| Label `🐞 bugs or small improvements` or "fix"/"bug" in title | `[Bug]` |
| Label `➕ big features` or ROADMAP-n in description | `[Feature]` |
| Label `business` or ISO/tax/legal in title | `[Business Ops]` |
| "spike", "evaluate", "research", "ADR" | `[Research]` |
| Infra/deps/docs/upgrade | `[Chore]` |
| No match | `[Chore]` + legacy footer |

## Label heuristics

| Signal | Source | Surface |
|--------|--------|---------|
| ROADMAP mirror cards | `Source: Founder` | infer from ROADMAP platform label |
| Agent-created (recent) | `Source: Agents` | infer from title/path |
| `needs funding` items | `Source: Founder` | keep in Icebox; remove funding label |
| `Docs/` in description | — | `Surface: Docs` |
| deploy/api/redis/postgres | — | `Surface: Infra` |
| `Mobile:` in title | — | `Surface: Mobile` |
| Default | `Source: Founder` | `Surface: Infra` |

## Legacy footer

```markdown
> Legacy migration — sanity check pending review
```

## Post-migration cleanup

- Delete legacy states: Backlog, Todo
- Delete legacy labels: `business`, `➕ big features`, `🐞 bugs or small improvements`, `needs funding`
