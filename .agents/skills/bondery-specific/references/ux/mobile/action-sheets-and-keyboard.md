# Action sheets and keyboard (mobile)

`ActionSheetPopup` forms and confirms. Shared validation: [forms-validation.md](../common/forms-validation.md). RHF wiring: `references/mobile-forms.md`.

---

## Autofocus

Sheets whose primary purpose is text input must focus that input after open animation.

```tsx
useEffect(() => {
  if (!open) return;
  const timer = setTimeout(() => inputRef.current?.focus(), UI_TIMING_MS.sheetFocusDelay);
  return () => clearTimeout(timer);
}, [open]);
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

- While `isBusy`: lock dismiss, disable fields (`editable={!isBusy}`), show loading on primary action.
- `ActionSheetPopup` `isBusy={isSubmitting}`.

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
