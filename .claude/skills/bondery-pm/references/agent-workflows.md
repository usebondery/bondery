# Agent workflows

MCP sequences for common MAIN board operations. Always verify `project_id = 5ab1d2fc-fe39-4adf-af3c-bad0165e151f`.

## Create card (agent)

```
create_work_item(
  project_id=MAIN,
  name="[Chore] ...",
  state=94a37b5a-efab-4a97-ad54-bb175fbd5423,  # Inbox
  assignees=[fe2bd70b-7756-40cf-b771-c767fc2c3559],
  labels=[Source: Agents, Surface: ...]
)
```

Agents never create cards directly in Building.

## Sanity-check intake

```
retrieve_work_item(work_item_id)
# Verify ## Sanity check section in description
update_work_item(state=Icebox | Bet, description_html=...)
```

## Groom stale Icebox

```
list_work_items(pql='state = "<Icebox UUID>" AND created_at < "<60 days ago>"')
# For each: comment + Won't do OR refresh with date bump
```

## Link ROADMAP

```
retrieve_work_item_by_identifier("ROADMAP-n")
# Prefer MCP when list_work_item_relation_definitions works:
# create_work_item_relation(..., relation_definition_id=..., relation_definition_label="relates to")
# Otherwise link in Plane UI → Relations → relates to
update_work_item(description_html with ## Roadmap section)
```

## Blocked

```
update_work_item(state=Blocked)
create_work_item_comment("Blocked: [who/what] — need [what]. Since YYYY-MM-DD.")
```

Do not add blocked details to description.

## Bulk migration (audit)

One-time legacy migration logic lives in [`../scripts/migrate-main-board.mjs`](../scripts/migrate-main-board.mjs). See [migration-heuristics.md](migration-heuristics.md). Do not re-run unless explicitly requested.

## Agent workflows checklist

- [ ] MAIN project UUID verified before every write
- [ ] New cards start in Inbox with Source: Agents
- [ ] Sanity check in description before leaving Inbox
- [ ] Blocked/Won't do use comments only
