# Modals (desktop / webapp)

Webapp modals for keyboard + pointer users. Mobile equivalent: `ui/Sheet` — see [mobile/action-sheets-and-keyboard.md](../mobile/action-sheets-and-keyboard.md).

---

## Loading

Match the loader to the **job**. There is no shared modal body loader and no `isLoading` on `ModalScrollLayout` / `ModalFooter` (footer has `actionLoading` on the primary button only). `useModalBlocking` is dismiss chrome, not a spinner.

| Job | What the user is waiting on | Body | Footer | `isBlocking` (hide X, no overlay/Esc) |
|-----|------------------------------|------|--------|----------------------------------------|
| **Prefetch that *is* the body** | Lists/options without which there is no UI | Title stays; `Center` + `Loader`; no footer | Hidden | **No.** Abort on unmount. |
| **Inline region** | One widget (picker, preview, chips) | Rest of form stays; spinner in that region (`CountChip isLoading`, picker `Loader`) | Stays | **No.** |
| **Submit** | Mutation, seconds | Form stays, fields disabled | `actionLoading` on the primary | **Yes.** |
| **Long-running job** | Generate/parse/commit that must be cancellable | Replace body with `Loader` + copy | **Cancel only** | **Yes.** |

`isBlocking` means: **leaving now would lose an in-flight write, or a job that must be cancelled explicitly.** Prefetch and preview fetches abort. Import parse and ZIP generate do not.

Do not use em dash, empty `{}`, or a spinning primary button as a stand-in for these jobs.

---

## No dismiss during blocking state

While **`isBlocking`** (submit or long-running job — not prefetch):

- Hide **X** close
- Disable click-outside and **Escape**
- Disable **all editable controls** in body
- Re-enable when request settles (success or error)

```tsx
const isBlocking = isSubmitting || mutation.isPending || isGenerating;
useModalBlocking(modalId, isBlocking);
```

**Open imperatively only** — `open*Modal()` + `modals.open`. Exception: `OnboardingFlowContent` in `OnboardingClient.tsx` (declarative non-dismissible `<Modal>` wizard shell).

See `apps/webapp/src/lib/modals/README.md`. CI: `pnpm run check:modal-patterns -w webapp`.

---

## `ModalFooter`

One component owns the button row — do not nest in another `Group`.

| Props | Role |
|-------|------|
| `dangerLabel` + `onDanger` | Left destructive (`IconTrash`) |
| `backLabel` + `onBack` | Import wizards |
| `cancelLabel` + `onCancel` | Dismiss |
| `actionLabel` / `actionType="submit"` | Primary |
| `createMoreLabel` + `onCreateMoreChange` (+ `createMoreChecked`, `createMoreDisabled`, `createMoreAriaDescription`) | Left-cluster switch for repetitive **create** only. App passes the translated label. Do not combine with `dangerLabel` / `backLabel`. See [create-more.md](./create-more.md). |

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
