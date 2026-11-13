---
name: remember
description: Save a person, a conversation, or a note in Bondery. Searches first so a duplicate never lands. Replaces important dates as a whole list. Needs Full access.
---

# Remember someone or something

Save a new person or a conversation the user just had.

## Steps

### A new person

1. Call `search_contacts` with the name before anything else.
2. When one person already matches, do not create a second card. Offer `update_contact` instead, and say why.
3. When several people match, list them by full name and company. Ask which person. Do not pick one.
4. When nobody matches, call `create_contact` with only the fields the user gave: name, and optionally emails, phones, socials, notes, location, and keep-in-touch cadence.

### A conversation

1. Find the people first with `search_contacts`. Search each participant.
2. Call `create_interaction` with `participantIds`, the date, the type, and the note. `participantIds` accepts at most 25 people.
3. When a participant already has no card, ask the user whether to create the contact first. Do not guess.

### A note or a new date

1. Use `update_contact` to change notes, channels, socials, language, timezone, or location. Send `[]` to clear a channel list.
2. Before `update_important_dates`, call `get_important_dates` and read the current list.
3. Send the full list back with the new entry. The tool replaces every date, so a partial list deletes the rest.

## Rules

- Full access is required for every write. When the user approved **Read only**, say so and stop. Ask them to reconnect with **Full access**.
- Search first, always. Never create a duplicate person.
- Ask before a delete. Deletes need a host confirmation, and some clients cannot confirm.
- Do not invent a date, an email, or a phone number. Save only what the user said.

## Failure lines

- **Not connected:** if no Bondery tools are available, say the Bondery plugin is not connected. Tell the user to connect the Bondery plugin in ChatGPT or Codex and sign in.
- **Signed out:** if a tool reports an authorization error, say the Bondery sign-in expired. Ask the user to reconnect and sign in again.
- **Read only when a write is needed:** if a write fails with a permission error, say the connector has **Read only** access. The user must reconnect with **Full access**.
- **Confirm before delete:** never delete a person, an interaction, a group, a tag, or a relationship without an explicit yes from the user in this conversation.
- **No match:** if a search returns nothing, say you found no match. Then ask whether to create the person.
- **Cap:** collection tools return at most 25 rows. `create_interaction` accepts at most 25 participants. `delete_tags` takes at most 25 tags. Split a longer list into batches, and tell the user when you do.
- **Own card delete block:** `delete_contact` cannot delete the user's own card. Say the own card stays, and point to the Bondery app.
- **Wrong tool result:** if a tool returns a wrong or confusing result, call `create_agent_feedback` with the tool name, what you expected, what you got, and the `request_id`. Never include names, emails, notes, or phone numbers in the report.
