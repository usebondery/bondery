---
name: get-to-know
description: Deep research on one person before you meet them, using what Bondery holds. Covers what they do, what you have in common, and who you both know. Read only.
---

# Get to know someone

Build a profile of one person from what Bondery holds, so the user walks into the room prepared.

## Steps

1. Ask for the name if the user did not give one. Ask for a company or a city when the name is common.
2. Call `search_contacts` with the name.
3. When several people match, list them by full name and company. Ask which person. Do not pick one.
4. Call `get_contact` for the chosen `personId`.
5. Call these in parallel with the same `personId`:
   - `get_contact_linkedin` for role, work history, and education
   - `get_relationships` for who they know in the user's network
   - `get_contact_groups` for shared context
   - `get_contact_tags`
   - `get_important_dates`
   - `get_interactions` for history
6. For each relationship the tools return, call `get_contact` on the related `personId` to name that person. Stop at the first 25 relationships.

## What to report

Answer the three questions the user came with, in this order:

1. **What they do.** Role, company, and the last two or three positions. Name the source when it is stored LinkedIn data rather than a note.
2. **What you have in common.** Shared groups, shared tags, shared employers, shared schools, a shared city, and any relationship the tools return. Show the overlap on both sides. Do not claim a match you cannot support from a tool result.
3. **Who you both know.** Name each related person and the relationship type. Say when the user has no stored relationship to that person.

Add one short section at the end: open threads the user can raise. Keep the whole answer under 300 words.

## Rules

- Read only. Never create, update, or delete anything in this skill.
- Call `get_contact_linkedin` here because the job needs work history. Skip it only when the user asks for a personal read with no work angle.
- Report only what a tool returned. Never fill a gap with a guess about a job, a school, or a person.
- Say "not stored" when a field is empty. That answer helps the user decide what to add later.

## Failure lines

- **Not connected:** if no Bondery tools are available, say the Bondery connector is not connected. Point the user to Connectors, then Connect, then **Use Claude's published identity**, then sign in.
- **Signed out:** if a tool reports an authorization error, say the Bondery sign-in expired. Ask the user to reconnect and sign in again.
- **Read only when a write is needed:** this skill reads. If the user asks to update a record, say a write needs **Full access** and point to the `remember` skill.
- **No match:** if `search_contacts` returns nothing, say you found no match. Offer the `remember` skill to save the person first, and say that needs **Full access**.
- **Cap:** relationship lists and collections return at most 25 rows. Say when a list is capped.
- **Own card delete block:** `delete_contact` cannot delete the user's own card. This skill never deletes.
- **Wrong tool result:** if a tool returns a wrong or confusing result, call `create_agent_feedback` with the tool name, what you expected, what you got, and the `request_id`. Never include names, emails, notes, or phone numbers in the report.
