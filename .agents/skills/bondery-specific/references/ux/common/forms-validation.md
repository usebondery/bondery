# Forms — validation (common)

Do not let users submit a form that cannot succeed. Disable primary action until valid.

Mobile sheet implementation: `references/mobile-forms.md`. Mobile phone layout: [mobile/action-sheets-and-keyboard.md](../mobile/action-sheets-and-keyboard.md).

---

## Rules

- **Required fields:** disable Save / Add until non-empty and format-valid.
- **Inline errors:** after blur or submit attempt — not aggressive on first keystroke.
- **One handler** for button tap and keyboard submit (mobile Done key).

---

## Webapp

- Mantine forms: disable submit until `form.isValid()` or equivalent `canSubmit`.
- Modal primary: `actionLoading` + `disabled` on invalid.

---

## Mobile

Derive `canSubmit` at render:

```tsx
const canSubmit = trimmedValue.length > 0 && EMAIL_REGEX.test(trimmedValue);
const primaryAction = { onPress: handleSave, disabled: !canSubmit, loading: isSubmitting };
```

Validate unmasked phone digits, not formatted display.

---

## What to avoid

- Enable submit then reject in handler with only a toast.
- Loading on button without disabled state during submit.
- Different validation on keyboard submit vs button tap.
