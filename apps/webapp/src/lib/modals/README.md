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
import { useModalBlocking } from "@/lib/modals";

function MyFeatureModalBody({ modalId }: { modalId: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isLoading } = useSomeQuery();

  const isBlocking = isSubmitting || isLoading;
  useModalBlocking(modalId, isBlocking);

  // ...
}
```

## Rules

- Never call `modals.updateModal` for dismiss flags in feature code — use `useModalBlocking`.
- Do not use `<Modal>` in feature code; onboarding shell is the only exception.
- Derive `isBlocking` from submit **and** load/parse/import states.
- Web `isBlocking` matches mobile `ActionSheetPopup` `isBusy`.
