# Action sheets and keyboard (mobile)

`ui/Sheet` forms and confirms. Shared validation: [forms-validation.md](../common/forms-validation.md). RHF wiring: [forms.md](./forms.md).

Text fields inside a sheet use `ui/TextInput` with `variant="sheet"` (or `SheetTextField`, which sets it). Do not use plain `RNTextInput` or `MobileTextInput` under `Sheet` — Gorhom needs sheet-aware focus for keyboard offset.

`ui/Sheet` sets `android_keyboardInputMode="adjustPan"` on Android and `keyboardBehavior="interactive"` on both platforms so fit-sized sheets lift above the keyboard (Gorhom `extend` only grows to the highest detent). Gorhom disables interactive offset when its Android mode is `adjustResize`.

---

## Autofocus

Sheets whose primary purpose is text input must focus that input after open animation.

Wire autofocus through `useSheetInputAutofocus` and `Sheet` `onSnapIndexChange`. Do not focus on `open` alone — the modal portal may not be mounted yet.

```tsx
const inputRef = useRef<NativeTextInputRef>(null);
const onSnapIndexChange = useSheetInputAutofocus(open, inputRef);

<Sheet onSnapIndexChange={onSnapIndexChange} opened={open} ...>
  <SheetTextField inputRef={inputRef} ... />
</Sheet>
```

Reset form state on open (`setValue("")`, clear errors).

---

## Done key → submit

Wire **Done** on the system keyboard to the same handler as the primary button.

| Wire Done → submit | Do not wire |
|--------------------|-------------|
| Create contact, add/edit social, email, phone | Search/filter fields |
| Single-primary submit sheets | Confirm-only delete sheets |

```tsx
<MobileTextInput
  returnKeyType="done"
  enterKeyHint="done"
  onSubmitEditing={handleSave}
  editable={!isSubmitting}
/>
```

Guard in handler: `if (!canSubmit) return`. One handler, two triggers.

**Phone-pad** often has no Done — sheet button remains fallback.

---

## Blocking sheets (`isBusy`)

Same rule as web `isBlocking`:

- While `isBusy`: lock dismiss, disable fields (`editable={!isBusy}`), show loading on primary action with `loadingText` (not spinner-only).
- `Sheet` `isBusy={isSubmitting}`.

---

## Phone number entry

- Country code + number on **one row** (~108px prefix).
- Accessibility: picker label **"Country code"**; search placeholder **"Search country or code"**.
- Number field placeholder: **"Phone number"**.

---

## What to avoid

- Floating keyboard toolbar when IME exposes Done.
- OS auto-focus without `sheetFocusDelay`.
- Re-focus on every render — gate on `open` transition.
