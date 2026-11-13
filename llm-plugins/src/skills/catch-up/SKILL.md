---
name: catch-up
description: Brief the user on one person before a meeting, a call, or a catch-up. Reads identity, recent interactions, important dates, relationships, groups, and tags. Read only.
---

# Catch up on someone

Brief the user on one person before they meet, call, or message them.

## Steps

1. Ask for the name if the user did not give one. If the name is vague, ask for one more detail, for example the company or the city.
2. Call `search_contacts` with the name.
3. When several people match, list them by full name and company. Ask which person. Do not pick one.
4. Call `get_contact` for the chosen `personId`.
5. Call these in parallel with the same `personId`:
   - `get_interactions` for recent history
   - `get_important_dates`
   - `get_relationships`
   - `get_contact_groups`
   - `get_contact_tags`
6. Call `get_contact_linkedin` only when the user asks about work history, a role, a company, or education. Skip it for a short personal catch-up.

## What to report

Write a short brief, not a data dump:

- Who they are: name, role, company, city.
- When you last spoke, and what you talked about.
- Dates to remember: birthday, anniversary, or another date in the next 60 days.
- Who else connects you: relationships and shared groups.
- Two or three open threads the user can pick up.

Order the brief by what the user needs first. Keep it under 200 words unless the user asks for more.

## Rules

- Read only. Do not create, update, or delete anything in this skill.
- Do not invent emails, phone numbers, jobs, or dates. Report only what a tool returned.
- Say when a section is empty. "No interactions saved" is useful. Silence is not.

## Failure lines

<!-- llm-plugin-connect -->
- **Not connected:** if no Bondery tools are available, say the Bondery plugin is not connected. Connect the Bondery plugin, then sign in.
<!-- /llm-plugin-connect -->
- **Signed out:** if a tool reports an authorization error, say the Bondery sign-in expired. Ask the user to reconnect the connector and sign in again.
- **Read only when a write is needed:** this skill reads. If the user asks to change a record, say a write needs **Full access** and point to the `remember` skill.
- **No match:** if `search_contacts` returns nothing, say you found no match. Ask for another spelling, a company, or a city. Do not create a contact from this skill.
- **Cap:** collection tools return at most 25 rows. Say when a list stops at 25, and page with `offset` if the user wants more.
- **Own card delete block:** `delete_contact` cannot delete the user's own card. This skill never deletes, so tell the user to use the Bondery app if they need that change.
- **Wrong tool result:** if a tool returns a wrong or confusing result, call `create_agent_feedback` with the tool name, what you expected, what you got, and the `request_id`. Never include names, emails, notes, or phone numbers in the report.
