# Webapp modals

Imperative overlays use Mantine `modals.open` via `open*Modal()` helpers. Dismiss chrome is controlled by `useModalBlocking`.

## Open a modal

```tsx
import { modals } from "@mantine/modals";
import { createModalId } from "@/lib/modals";

export function openMyFeatureModal(options: Options = {}) {
  const modalId = createModalId("my-feature");
  modals.open({
    modalId,
    title: <ModalTitle text="..." icon={...} />,
    children: <MyFeatureModalBody modalId={modalId} {...options} />,
  });
}
```

## Modal body

```tsx
import { useModalDismiss } from "@/lib/modals";

function MyFeatureModalBody({ modalId }: { modalId: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isLoading } = useSomeQuery();

  const isBlocking = isSubmitting || isLoading;
  const { closeModal, closeModalSync } = useModalDismiss(modalId, isBlocking);

  // On success, close with closeModal() or closeModalSync() when parent
  // callbacks must run after the overlay is gone.
}
```

`useModalDismiss` wraps `useModalBlocking` and prevents a closed modal from being
reopened when `isBlocking` later flips to `false` (for example after a contacts
query finishes loading).

Use `useModalBlocking(modalId, isBlocking)` directly only when the modal never
closes while async loading can still complete (rare).

## Rules

- Never call `modals.updateModal` for dismiss flags in feature code — use `useModalBlocking` / `useModalDismiss`.
- Never call `modals.close(modalId)` directly in modal bodies that use blocking state — use `closeModal` / `closeModalSync` from `useModalDismiss`.
- Do not use `<Modal>` in feature code; onboarding shell is the only exception.
- Derive `isBlocking` from submit **and** load/parse/import states.
- Web `isBlocking` matches mobile `ActionSheetPopup` `isBusy`.

## Scrollable modal bodies

When a modal can scroll (tables, long card grids, merge conflicts), use **`ModalScrollLayout`** from `@bondery/mantine-next` so `ModalFooter` stays visible. Pass `footer={<ModalFooter mt={0} ... />}` and put scrollable content in `children`.

Short forms and confirm dialogs keep `Stack` + inline `ModalFooter` — no layout wrapper needed.
