# UX writing

All user-visible copy goes through `packages/translations` — see `SKILL.md` § UI translations. This file defines **voice and structure**, not string keys.

---

## Voice

| Rule | Example |
|------|---------|
| **Sentence case** | "Add person" not "Add Person" (except proper nouns, brand) |
| **Short** | One idea per sentence; trim filler |
| **Second person** | "Your contacts" not "The user's contacts" |
| **Active** | "Delete group" not "Group will be deleted" |

---

## Errors

Structure: **what happened** + **what to do**.

| Bad | Good |
|-----|------|
| "Error 503" | "Bondery is temporarily unavailable. We'll keep checking." |
| Server `message` verbatim | `getUserFacingError(error, t)` / catalog copy |
| "Something went wrong" alone | Name the action that failed + retry or next step |

API errors use nested envelope + `common.errors.api.{code}` — never surface raw server `message` in UI.

---

## Empty states

**Opportunity framing, not apology.**

| Bad | Good |
|-----|------|
| "Sorry, no contacts found" | "No contacts yet" + Add person CTA |
| "We couldn't find anything" | "No results for '{query}'" + clear search |

See [empty-states.md](./empty-states.md).

---

## Destructive confirm dialogs

Align with [destructive-actions.md](./destructive-actions.md):

| Element | Rule |
|---------|------|
| **Title** | Name the thing: "Delete {name}?" — not "Are you sure?" |
| **Body** | One sentence on permanence: "This contact and all their data will be permanently removed." |
| **Confirm button** | Verb of action: "Delete" — not "OK" or "Yes" |
| **Cancel** | "Cancel" from `common.actions` |

---

## Buttons and labels

- Prefer verbs for primary actions: Save, Add, Import, Retry.
- Placeholders describe expected input, not instructions essays.
- `aria-label` when visible label is insufficient — see mobile phone field rules in [forms-validation.md](./forms-validation.md).

---

## What to avoid

- Technical jargon in user-facing copy (HTTP status, table names).
- Blaming the user ("Invalid input").
- Duplicate confirmation in toast + navigation for the same success — see [feedback-and-confirmations.md](./feedback-and-confirmations.md).
