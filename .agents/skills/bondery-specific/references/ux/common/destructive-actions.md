# Destructive actions

Friction should match **consequences**, not developer convenience. Copy rules: [ux-writing.md](./ux-writing.md).

---

## Decision table

| Situation | Pattern |
|-----------|---------|
| **Hard delete, no undo** (contact, account, group) | Two-step: overflow menu → confirm dialog |
| **Soft remove or easily reversed** (social link, clear field) | Direct action; undo toast if feasible |
| **Batch delete** | Always confirm — high consequence |
| **Action inside a sheet** | Confirm in same sheet; no extra screen |

---

## Confirm dialog copy

- **Title:** "Delete [Name]?" — not "Are you sure?"
- **Body:** One sentence on permanence.
- **Button:** "Delete" — not "OK" / "Yes"
- **Style:** Destructive (`tone="danger"` web, red iOS)

---

## Delete in modal footers (web)

Three-action footer: destructive left, cancel + save right — use **`ModalFooter`** `dangerLabel` + `onDanger`. Icon: `IconTrash` for entity delete; minus/X for remove-association only.

Example: `openTagEditorModal.tsx`. See [desktop/modals.md](../desktop/modals.md).

---

## What to avoid

- Confirming easily reversible actions — trains users to ignore dialogs.
- "Are you sure?" without explaining consequences.
- Skipping confirmation for hard deletes.
- Batch delete without confirmation.
