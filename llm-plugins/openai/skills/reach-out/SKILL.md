---
name: reach-out
description: Show who to contact this week. Lists overdue keep-in-touch contacts and upcoming important-date reminders as two separate lists. Read only.
---

# Who to reach out to

Answer "who should I contact" with two clean lists. Do not mix them.

## Steps

1. Call `get_keep_in_touch_count` to get the overdue total.
2. Call `get_keep_in_touch_contacts` for the people with a keep-in-touch cadence.
3. Call `get_upcoming_reminders` for dates with notifications in the next month.
4. When the user wants one person in more detail, run the `catch-up` skill for that person.

## What to report

Keep two lists. Give each list its own heading, and never merge them.

- **Overdue keep-in-touch.** Each row: full name, cadence in days, and the last interaction date.
- **Dates coming up.** Each row: full name, the date, and how many days away.

Put the overdue total above the first list, taken from `get_keep_in_touch_count`. Each list stops at 25 rows. Say when it does.

When both lists are empty, say nobody is due this week. Do not pad the answer.

## Rules

- Read only. Do not create or update a cadence from this skill. Use `remember` or the Bondery app when the user wants to change one.
- Do not rank people by guessed importance. Order each list by the date the tool returns.
- Cadence is a nudge rhythm, not a message. Do not draft or send a message here.

## Failure lines

- **Not connected:** if no Bondery tools are available, say the Bondery plugin is not connected. Tell the user to connect the Bondery plugin in ChatGPT or Codex and sign in.
- **Signed out:** if a tool reports an authorization error, say the Bondery sign-in expired. Ask the user to reconnect and sign in again.
- **Read only when a write is needed:** this skill reads. If the user asks to change a cadence, say a write needs **Full access** and the `remember` skill.
- **Nobody due:** when both lists are empty, say nobody is due this week. Suggest checking again next week or lowering a cadence in the app.
- **Cap:** each list stops at 25 rows. Say when a list is capped, and page with `offset` when the user wants the rest.
- **Own card delete block:** `delete_contact` cannot delete the user's own card. This skill never deletes.
- **Wrong tool result:** if a tool returns a wrong or confusing result, call `create_agent_feedback` with the tool name, what you expected, what you got, and the `request_id`. Never include names, emails, notes, or phone numbers in the report.
