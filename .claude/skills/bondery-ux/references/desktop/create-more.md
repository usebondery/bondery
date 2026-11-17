# Create more (repeatable create modals)

Webapp pattern for creating several of the same entity without reopening the modal. Mobile sheets are out of scope until `ActionSheetPopup` grows a chrome slot. See [modals.md](./modals.md) for footer, blocking, and loading jobs. Toast rules: [feedback-and-confirmations.md](../common/feedback-and-confirmations.md).

---

## When to use

A **create** modal for a first-class CRM entity users often add in a burst (person, group, interaction, tag).

Skip this pattern for edit, delete, confirm, import/export, share, merge, settings wizards, API key reveal, membership pickers, and nested "create one and return it to the parent modal."

---

## Behavior

A Mantine `Switch` in `ModalFooter`, label **Create more**.

| Switch | After a successful create |
|--------|---------------------------|
| **Off** (default) | Existing close, navigate, `onCreated`, and toast behavior. Do not change that path to "add or remove" toasts. |
| **On** | Do **not** close. Do **not** navigate. Do **not** call picker `onCreated`. Show a **success notification** (required). Reset the form for the next create. Focus the first field. |

Default is **off**. Do not persist the switch. Every time the modal opens, it starts off. Do not use `sessionStorage` or `localStorage`.

---

## Decision tree (new modal)

| Question | If yes |
|----------|--------|
| Is this edit, confirm, import, or a nested picker (`repeatable: false`)? | No switch. |
| Will the user reasonably create several in one sitting? | Add Create more. |
| Does success currently navigate to the new entity? | Off path: keep that. On path: skip navigate, toast instead. |
| Does success currently skip a toast because the next screen is the confirmation? | Off path: still skip. On path: **must toast**. |

---

## Footer API

`ModalFooter` in `packages/mantine-next` takes the label from the app (the package has no i18n), same as `actionLabel`.

Show the switch only when `createMoreLabel` and `onCreateMoreChange` are both passed.

Layout below `sm`: switch on its own row above Cancel + primary. Cancel and primary share that row at equal width. From `sm` up: left cluster = switch, right cluster = Cancel + primary (`justify="space-between"`). Do not render the switch when `dangerLabel`/`onDanger` or `backLabel`/`onBack` are set (create vs edit/wizard). Single-action full-width footers ignore Create more props.

Pass `createMoreDisabled={isBlocking}` so the switch matches other controls during submit. See [modals.md](./modals.md#no-dismiss-during-blocking-state).

---

## State and submit

Own the boolean with `useCreateMore` in `apps/webapp/src/lib/modals` (not in Mantine `useForm`, not in the create schema).

```tsx
const { createMore, setCreateMore } = useCreateMore({ enabled: repeatable });
const tCommon = useCommonTranslations();

<ModalFooter
  actionLabel={...}
  cancelLabel={...}
  createMoreAriaDescription={tCommon("a11y.createMore")}
  createMoreChecked={createMore}
  createMoreDisabled={isBlocking}
  createMoreLabel={tCommon("actions.createMore")}
  onCancel={closeModal}
  onCreateMoreChange={setCreateMore}
  ...
/>
```

Submit success:

```tsx
// keep the modal's existing success notification call
if (createMore) {
  resetForNextCreate();
  setIsSubmitting(false);
  queueMicrotask(() => firstFieldRef.current?.focus());
  return;
}
closeModal();
// existing onCreated / navigate
```

Do not call `closeModal` / `closeModalSync` on the Create more path. Do not remount the modal to clear fields. Do not use `form.reset()` if that restores a one-shot prefill (`initialFullName`, search `initialLabel`). Set the **next-create** values explicitly.

Errors: keep values, no reset, existing error toast.

Cancel / X / Esc: close and discard, even if the form is dirty and the switch is on. No extra confirm.

---

## Reset rule

| Field kind | After Create more success |
|------------|---------------------------|
| One-shot prefill (name from opener, search label) | Clear |
| Unique body (name, LinkedIn, group label, interaction title + note) | Clear |
| Context from opener that applies to every item (person page → same participant ids; tag created from a person → that person still selected) | Keep |
| Fresh system defaults (new random emoji/color, date stays "today" unless the user changed it for a batch) | Re-apply as specified per modal |

---

## Nested pickers

`openAddContactModal` from `NewActivityModal` and `openAddGroupModal({ onCreated })` from `AddPeopleToGroupSelectionModal` must pass `repeatable: false` so the switch is hidden. Those flows need exactly one entity back in the parent.

Stacked Mantine modals remount the parent overlay when the nested modal closes, which drops in-memory form state. Log interaction therefore passes `parentModalId` and persists both `rememberCreatedContactForModal` and the form draft (`saveActivityFormDraft`) so title, note, date, type, and selected people rehydrate after remount. Opening the nested person picker locks that draft until the child modal `onClose` so a remount reset cannot overwrite it via `onValuesChange`. `AddPeopleToGroupSelectionModal` still uses `onCreated` because selection lives in `useState`, not `form.values`.

A parent form that reads `form.values` in render must use Mantine `mode: "controlled"` or the picker will keep the initial empty selection.

---

## i18n

| Key | EN |
|-----|----|
| `common.actions.createMore` | Create more |
| `common.a11y.createMore` | After creating, stay in this dialog to add another |

Add the same keys in `cs` and `de`. Pass both into `ModalFooter`. Do not hardcode the label in `mantine-next`.

---

## Mobile

Out of scope. `CreateContactSheet` / `GroupEditSheet` (create) stay close-and-navigate / close-into-list. If a later change adds this to sheets, move or duplicate this file under `common/` and give `ActionSheetPopup` a chrome slot. Do not squeeze a switch into the existing 1–2 action row.

---

## What to avoid

- Checkbox or a second primary button
- Create more on edit modals
- Toast-system rewrite
- Adding success toasts to the off/close path "while we are here"
- `modals.updateModal` for this
- Persisting the switch (`sessionStorage` / `localStorage`)
- CI `check:modal-patterns` enforcement in v1

---

## Checklist

- [ ] Switch only on repetitive **create** modals (or `repeatable: false` documented at the caller)
- [ ] Label and aria description from `common.*`, passed into `ModalFooter`
- [ ] On path: no close, no navigate, success toast, reset, focus, `setIsSubmitting(false)`
- [ ] Off path: existing close / navigate / toast unchanged
- [ ] Nested pickers pass `repeatable: false`
- [ ] Switch disabled while `isBlocking`
- [ ] No danger/back on the same footer
- [ ] en / cs / de keys present
