# MCP tools — naming and scope

Bondery’s MCP HTTP server (`POST /mcp`) is a small assistant-facing surface over the same domain as REST. It is not a second REST API and never grants REST `api:access`.

When adding or renaming MCP tools, follow this file. Product copy for users lives in [`docs/bondery/mcp.mdx`](../../../../docs/bondery/mcp.mdx).

## Tool names

`{verb}_{resource}` in snake_case.

| Verb | Means | When to use |
|------|--------|-------------|
| `create` | Insert a record | Single-record create the user owns |
| `get` | Read one record, or a **non-search** filtered collection | By id (`get_contact`) or by a scoped filter (`get_interactions` + optional `personId`, `get_groups` browse) |
| `update` | Patch a record the user owns | Single-record mutations |
| `delete` | Remove a record | Single record the user owns. People and interactions are deletable only after MCP protocol confirm (`input_required` elicitation). |
| `search` | Free-text lookup | **Required** argument named `search` (not `query` / `q`); cap 25. Never dumps the full set. |

**Rules:**

- The verb is exactly `create`, `get`, `update`, `delete`, or `search`.
- The resource is a snake_case noun: **singular** for one record (`get_contact`), **plural** for a collection (`search_contacts`, `get_interactions`).
- Free-text lookup is `search_*` with a required `search` argument. Do not use `get_*` for name/label search.
- Non-search collection reads are `get_*` with filter args (`personId`, `limit`, `offset`). Never `list_*`.
- History writes are `create_*`. Never `log_*`.
- Do not use `list`, `log`, `find`, `fetch`, `query`, `add`, `set`, or `upsert` as the verb.

```
# GOOD
search_contacts
get_contact
get_contact_by_social
get_contact_linkedin
create_contact
update_contact
get_contact_share
create_contact_share
get_interactions
get_interaction
create_interaction
update_interaction
search_groups
get_groups
get_group
create_group_membership

# BAD
get_contacts          (free-text people lookup must be search_contacts)
list_interactions
log_interaction
fetch_contact
add_contact
query_groups
find_tags
```

Contacts, interactions, groups, tags, relationships, and memberships **are** deletable over MCP. Every `delete_*` tool checks ownership first, then returns protocol confirm (`resultType: "input_required"`) so a foreign id never becomes a confirm dialog. `create_contact_share` uses the same confirm pattern because outbound email cannot be undone. REST still has `DELETE /contacts` and `DELETE /interactions/:id`. Clients that never retry elicitation cannot delete or send a share.

## Arguments

Align with REST query names where they mean the same thing:

| Meaning | MCP argument | REST |
|---------|--------------|------|
| Free-text search | `search` (required on `search_*`) | `search` (not `q`) |
| Contact UUID | `personId` | path `:id` / `contactId` |
| Offset paging | `limit`, `offset` | `limit`, `offset` |

MCP collection reads and membership arrays are **capped** (25). `search_*` **requires** `search` so the model cannot dump the full set. REST `GET /contacts` can list without `search`.

Write tools are detected by name (`isMcpWriteToolName`: `/^(create|update|delete)_/`), not a hand-maintained set. `mcpAuthHandler` requires `mcp:write` for those names. `tools/list` stays unfiltered.

Success `structuredContent` is the same resource-keyed JSON as REST (`outputSchema` from `@bondery/schemas`). Deletes after confirm return `{ message }`. Tool failures set `isError: true` and put the REST nested envelope in `content[0].text` and `structuredContent`:

```json
{
  "error": {
    "type": "not_found_error",
    "code": "contact_not_found",
    "message": "Contact not found",
    "request_id": "...",
    "doc_url": "https://usebondery.com/docs/api/errors/contact_not_found"
  }
}
```

Do not union `apiErrorResponseSchema` into every MCP `outputSchema`. HTTP MCP auth/protocol errors stay JSON-RPC. Cancelled confirms stay success `{ message, cancelled }`.

## Instructions vs prompts

`MCP_SERVER_INSTRUCTIONS` (`apps/api/src/routes/mcp/instructions.ts`) is the server `instructions` string on initialize. Hosts inject it as always-on policy (search before create, cap 25, no dump, Full access for writes). Do not duplicate that policy in every prompt.

## Prompts

MCP prompts are user-facing templates (`prompts/list`, `prompts/get`). They are not CRUD tools.

- Name: snake_case **intent**, not a CRUD verb (`catch_up_on_contact`, not `get_contact_summary`)
- Title + description: what the user wants done
- Body: instruct the model to call the named tools (`search_contacts`, `get_contact`, …)
- Do not run tools inside the prompt callback — return messages only

## REST vs MCP

MCP covers assistant-sized CRM work (contacts, dates, interactions, groups, tags, relationships, keep-in-touch, stored LinkedIn history). Everything else stays REST (API keys, session, or first-party apps).

In-app chat registers the same tool names as MCP (`create_interaction`, not `log_interaction`). Chat deletes call the domain directly after the model confirms in the thread; MCP still uses protocol confirm.

| Capability | REST | MCP |
|------------|------|-----|
| List/search contacts | `GET /contacts` (optional `search`, sort, filters, up to 200) | `search_contacts` (`search` required, max 25) |
| Get one contact | `GET /contacts/:id` | `get_contact` (same `{ contact }` JSON as REST; no extra groups/tags on the card) |
| Create contact | `POST /contacts` (full create body) | `create_contact` (name plus optional phones, emails, socials, notes, profile) |
| Update contact | `PATCH /contacts/:id` (full patch) | `update_contact` (identity, notes, language, timezone, geo, keep-in-touch, socials, phones/emails/addresses; omits photo/dates/tenant fields) |
| Delete contact | `DELETE /contacts`, `DELETE /contacts/:id` | `delete_contact` (protocol confirm; refuses myself) |
| Emails, phones, social, addresses | Nested contact routes + PATCH | Writable on `create_contact` / `update_contact` (`[]` clears). `get_contact_by_social` looks up Instagram, LinkedIn, or Facebook. |
| Important dates | `GET`/`PUT /contacts/:id/important-dates`, upcoming | `get_important_dates`, `update_important_dates` (replace-all, including empty; no elicitation), `get_upcoming_reminders` |
| Contact groups/tags | `GET /contacts/:id/groups`, `GET /contacts/:id/tags` | `get_contact_groups`, `get_contact_tags` |
| LinkedIn work/education | `GET /contacts/:id/linkedin-data` | `get_contact_linkedin` (read of stored bio, work, and education; enrich upsert stays REST) |
| Groups | `GET/POST/PATCH/DELETE /groups`, membership routes | `search_groups`, `get_groups`, `get_group`, `create_group`, `update_group`, `delete_group`, `get_group_contacts`, `create_group_membership`, `delete_group_membership` |
| Tags | `GET/POST/PATCH/DELETE /tags`, membership routes | `search_tags`, `get_tags`, `get_tag`, `create_tag`, `update_tag`, `delete_tag`, `get_tag_contacts`, `create_tag_membership`, `delete_tag_membership` |
| Relationships | Nested contact relationship routes | `get_relationships`, `create_relationship`, `update_relationship`, `delete_relationship` |
| Keep-in-touch | Contact fields + overdue count | `get_keep_in_touch_count`, `get_keep_in_touch_contacts`, `update_keep_in_touch` (also on `update_contact`) |
| Share contact | `GET /contacts/:id/share-preview`, `POST /contacts/share` | `get_contact_share`, `create_contact_share` (protocol confirm; outbound email is irreversible) |
| Merge, enrich, import, export, map, photo | Dedicated REST resources | — |
| List interactions | `GET /interactions` (optional `contactId`) | `get_interactions` (optional `personId`, max 25; recent page if unfiltered) |
| Get one interaction | `GET /interactions/:id` | `get_interaction` |
| Update interaction | `PATCH /interactions/:id` (participants array) | `update_interaction` (`participantIds` replace, max 25) |
| Delete interaction | `DELETE /interactions/:id` | `delete_interaction` (protocol confirm; `findFirst` `{id, userId}` first) |
| Create interaction | `POST /interactions` (any participants) | `create_interaction` (`participantIds`, max 25) |
| In-app chat, sync, billing, settings, API keys | REST | — |

Auth: REST uses session cookies, bearer, or API keys. MCP uses OAuth 2.1 + PKCE with `mcp:read` / `mcp:write` only.

Do not wrap over MCP: bulk `DELETE` with `ids[]`, `contactFilter` / `memberFilter` membership, avatar previews, or import defaults.

## Checklist

- [ ] Tool name is `{create\|get\|update\|delete\|search}_{resource}`
- [ ] Free-text lookup uses `search_*` with required `search`, cap 25 — not `get_*` / `list_*`
- [ ] Non-search collection reads use plural `get_*` + filters, not `list_*`
- [ ] New writes that append history use `create_*`, not `log_*`
- [ ] Search argument is `search` (not `query` / `q`)
- [ ] Write tools match `isMcpWriteToolName` (`/^(create|update|delete)_/`) and require `mcp:write` in `mcpAuthHandler` (do not filter `tools/list` by scope)
- [ ] Every `registerTool` sets `title` plus all four annotation hints via `mcp-tool-meta`
- [ ] Every `delete_*` tool uses `confirm-delete` (HMAC `requestState`; ownership/not-found **before** elicit). `create_contact_share` uses the same confirm helper (outbound email is irreversible).
- [ ] User docs + `mcp-server-card.json` list the same names
- [ ] `pnpm --filter api run check:mcp-tool-names` passes
