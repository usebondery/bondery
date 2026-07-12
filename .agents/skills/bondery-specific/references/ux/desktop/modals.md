# Modals (desktop / webapp)

Webapp modals for keyboard + pointer users. Mobile equivalent: `ActionSheetPopup` — see [mobile/action-sheets-and-keyboard.md](../mobile/action-sheets-and-keyboard.md).

---

## No dismiss during blocking state

While **`isBlocking`** (submitting, loading, import parse):

- Hide **X** close
- Disable click-outside and **Escape**
- Disable **all editable controls** in body
- Re-enable when request settles (success or error)

Derive blocking from submit **and** load/parse — not submit alone.

```tsx
const isBlocking = isSubmitting || isLoading || mutation.isPending;
useModalBlocking(modalId, isBlocking);
```

**Open imperatively only** — `open*Modal()` + `modals.open`. Exception: `OnboardingFlow` wizard shell.

See `apps/webapp/src/lib/modals/README.md`. CI: `npm run check-modal-patterns:strict`.

---

## `ModalFooter`

One component owns the button row — do not nest in another `Group`.

| Props | Role |
|-------|------|
| `dangerLabel` + `onDanger` | Left destructive (`IconTrash`) |
| `backLabel` + `onBack` | Import wizards |
| `cancelLabel` + `onCancel` | Dismiss |
| `actionLabel` / `actionType="submit"` | Primary |

---

## `ModalScrollLayout`

Long modal bodies: pin footer outside scroll — header (filters) · scrollable body · fixed footer. Matches mobile sheet layout.

Do not use per-modal `ScrollArea h={…}` for footer reachability.

---

## Autofocus

First input in a text modal: Mantine `autoFocus` or `useFocusTrap`.

---

## What to avoid

- `<Modal>` in feature code
- `modals.updateModal` for dismiss flags
- Editable fields during `isBlocking`
- X visible while footer shows loading
