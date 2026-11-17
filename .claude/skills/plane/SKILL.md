---
name: plane
description: "Interact with Plane.so project management via MCP. Use when: creating work items, updating issues, listing tasks, searching Plane, managing cycles/sprints, organizing modules, tracking epics, assigning issues, adding comments, creating labels, managing states, viewing project boards, or any task involving Plane work items, PROJ-123 identifiers, or project planning in Plane."
argument-hint: "Describe what you want to do in Plane (e.g. 'create a bug for the login page', 'list open issues in the webapp project')"
---

# Plane MCP Skill

## When to Use

- User says "create an issue / work item / task / bug / feature"
- User references a Plane identifier like `PROJ-123` or `MAIN-456`
- User wants to list, search, update, or close work items
- User wants to organize work into cycles (sprints), modules, or milestones
- User asks about epics, initiatives, or project status
- User wants to add comments, labels, or log work

## Mandatory First Step

**All `mcp_plane_*` tools are deferred.** Before calling any of them, load the tools with:

```
tool_search_tool_regex("mcp_plane")
```

Do this once at the start. Calling a deferred tool without loading it will fail silently.

---

## Common Workflows

### 1. Identify Context

Always start by establishing what project the user is referring to.

```
mcp_plane_list_projects          → get list of projects with their IDs and identifiers
mcp_plane_get_me                 → get current user info (for assignments)
```

If the user references a work item by identifier (e.g. `MAIN-42`), use:
```
mcp_plane_retrieve_work_item_by_identifier  → resolves identifier → work item details
```

---

### 2. Work Items (Issues / Tasks / Bugs)

| Goal | Tool |
|------|------|
| List work items | `mcp_plane_list_work_items` |
| Search by keyword | `mcp_plane_search_work_items` |
| Get a specific item | `mcp_plane_retrieve_work_item` |
| Create a new item | `mcp_plane_create_work_item` |
| Update (status, assignee, priority, etc.) | `mcp_plane_update_work_item` |
| Delete | `mcp_plane_delete_work_item` ⚠️ confirm first |
| Add a comment | `mcp_plane_create_work_item_comment` |
| Link two items | `mcp_plane_create_work_item_relation` |

**When creating a work item**, always try to resolve:
- `project_id` (from `mcp_plane_list_projects`)
- `state_id` — default to the first "unstarted" state from `mcp_plane_list_states`
- `priority` — default to `"none"` unless user specifies
- `label_ids` — optional, resolve from `mcp_plane_list_labels`

---

### 3. States & Labels

```
mcp_plane_list_states            → list workflow states for a project
mcp_plane_list_labels            → list available labels
mcp_plane_create_label           → create a new label if it doesn't exist
```

---

### 4. Cycles (Sprints)

```
mcp_plane_list_cycles                   → see all cycles
mcp_plane_retrieve_cycle                → details for one cycle
mcp_plane_create_cycle                  → create a new cycle
mcp_plane_add_work_items_to_cycle       → move items into a cycle
mcp_plane_list_cycle_work_items         → list items in a cycle
mcp_plane_transfer_cycle_work_items     → move incomplete items to next cycle
```

---

### 5. Modules (Groupings / Epics-lite)

```
mcp_plane_list_modules                  → list all modules
mcp_plane_create_module                 → create a new module
mcp_plane_add_work_items_to_module      → assign items to a module
mcp_plane_list_module_work_items        → view module contents
```

---

### 6. Epics & Initiatives

```
mcp_plane_list_epics                    → list epics in project
mcp_plane_create_epic                   → create a new epic
mcp_plane_list_initiatives              → high-level initiatives
mcp_plane_create_initiative             → create initiative
```

---

### 7. Milestones

```
mcp_plane_list_milestones               → list milestones
mcp_plane_create_milestone              → create milestone
mcp_plane_add_work_items_to_milestone   → assign items to milestone
```

---

## Safety Rules

- **Confirm before deleting** any work item, cycle, module, epic, initiative, or project.
- **Never delete** unless the user explicitly says "delete" or "remove permanently".
- Updating a work item's state to a "cancelled" or "done" state is safe without confirmation.
- When in doubt about `project_id`, call `mcp_plane_list_projects` rather than guessing.

---

## Tips

- Plane identifiers (`MAIN-42`) are human-readable shortcuts — always use `mcp_plane_retrieve_work_item_by_identifier` to resolve them to UUIDs before updating.
- Use `mcp_plane_search_work_items` when the user describes an item by name rather than ID.
- When no priority is specified, use `"none"`.
- When no assignee is specified, leave `assignee_ids` empty (don't assign to self automatically).
