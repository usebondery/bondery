# Mobile Forms Pattern (React Hook Form)

Canonical patterns for Bondery mobile `ActionSheetPopup` forms.

## Core rule

All submit/update sheet forms use:

- `useSheetForm(...)` from `apps/mobile/src/lib/forms/useSheetForm.ts`
- `zodResolver`-backed schema from `@bondery/schemas`
- shared wrappers from `apps/mobile/src/components/form`:
  - `SheetTextField`
  - `SheetSelectField`
  - `SheetPhoneField`

## Why this pattern

- Prevents form reset while typing when parent props update.
- Keeps validation logic in one schema source of truth.
- Improves render performance with stable handlers + memoized input.
- Standardizes UX for errors, submit loading, and keyboard submit.

## Base implementation

```tsx
const {
  control,
  handleSubmit,
  setValue,
  watch,
  formState: { isDirty, isValid, isSubmitting },
} = useSheetForm({
  open,
  schema: formSchema,
  getDefaultValues: () => ({ ... }),
  mode: "onChange",
});
```

Use `isSubmitting` for:

- `ActionSheetPopup` → `isBusy={isSubmitting}`
- Primary action → `loading: isSubmitting`

## Text input field pattern

```tsx
<SheetTextField
  control={control}
  name="label"
  returnKeyType="done"
  onSubmitEditing={() => void onSubmit()}
/>
```

## Non-text control pattern (SettingsSelect, wheel, pickers)

Use wrappers first:

```tsx
<SheetSelectField control={control} name="type" label="Type" options={typeOptions} />
<SheetPhoneField control={control} watch={watch} name="value" prefixName="prefix" />
```

For controls that cannot be directly controlled (wheel picker, image picker), use:

```tsx
setValue("date", iso, { shouldDirty: true, shouldValidate: true });
```

## Submit pattern

```tsx
const onSubmit = handleSubmit(async (parsed) => {
  await save(parsed);
  onClose();
});

const primaryAction = {
  label: t("..."),
  onPress: () => void onSubmit(),
  disabled: !isValid || !isDirty,
  loading: isSubmitting,
  tone: "primary",
  variant: "filled",
};
```

Use the same submit handler for button and keyboard (`onSubmitEditing`).

## What stays outside RHF state

Keep non-form UI state local:

- sheet open/close flags (`isWheelOpen`, delete-confirm dialogs)
- image upload local state (`avatarUri`, picker busy flags)
- transient chip-input draft fields (e.g. raw recipient draft text)

## Validation and transformation

- Schemas in `@bondery/schemas` own normalization (`trim`, null transforms, coercion).
- Submit handlers should use parsed schema output directly for API payloads.
- Use `z.preprocess` for string-to-number/nullable conversions where needed.

## Guardrails

- Run `npm run audit:forms` in `apps/mobile` to enforce:
  - every submit/update form imports `@bondery/schemas`
  - forbidden patterns (`unknown as z.ZodType`, `zodResolver(schema as any)`, `EMAIL_REGEX`) are not used in submit forms
