---
name: share-person
description: Email a contact card to one or more people. Previews the fields first and waits for the user to confirm the recipients and fields. Needs Full access.
---

# Share a person

Email a contact card to a colleague, a recruiter, or a friend. The user picks the recipients and the fields.

## Steps

1. Find the person with `search_contacts`.
2. When several people match, list them by full name and company. Ask which person. Do not pick one.
3. Call `get_contact_share` with the chosen `personId`. It returns `contactName` and `availableFields`.
4. Show `contactName` and every available field to the user. Ask two questions:
   - Which email addresses receive the card? At most 10.
   - Which fields go in the card?
5. Read the answer back in one short message: contact name, recipients, and selected fields. Ask for an explicit yes.
6. After the yes, call `create_contact_share` with `personId`, `recipientEmails`, and `selectedFields`. Add `message` when the user gave one.
7. Report the result. Say the email cannot be undone.

## Rules

- Full access is required. When the user approved **Read only**, say so and stop.
- Never send a share email without an explicit yes in this conversation. The host also asks for a confirmation. Do not skip either step.
- Send only the fields the user chose. Do not add a field to make the card look better.
- Accept at most 10 recipients. Ask the user to split a longer list.
- Do not guess an email address. Ask for the full address.

## Failure lines

<!-- llm-plugin-connect -->
- **Not connected:** if no Bondery tools are available, say the Bondery plugin is not connected. Connect the Bondery plugin, then sign in.
<!-- /llm-plugin-connect -->
- **Signed out:** if a tool reports an authorization error, say the Bondery sign-in expired. Ask the user to reconnect and sign in again.
- **Read only when a write is needed:** if the share fails with a permission error, say the connector has **Read only** access. The user must reconnect with **Full access**.
- **Confirm before a share email:** never send with a guessed or implied yes. Outbound email cannot be undone.
- **No match:** if `search_contacts` returns nothing, say you found no match. Ask for another spelling or a company. Do not create a new contact from this skill.
- **Cap:** a share email accepts at most 10 recipients. Say when the list is longer.
- **Own card delete block:** `delete_contact` cannot delete the user's own card. This skill never deletes.
- **Wrong tool result:** if a tool returns a wrong or confusing result, call `create_agent_feedback` with the tool name, what you expected, what you got, and the `request_id`. Never include names, emails, notes, or phone numbers in the report.
