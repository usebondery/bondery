# UX Patterns

Bondery-specific UX principles for both the mobile app and webapp. These apply across platforms unless a section explicitly says otherwise.

---

## Feedback and confirmations

Do not add success notifications (toasts, banners, snackbars, modals) when the user can already see that the action worked. The visible result **is** the confirmation.

### Skip success feedback when

The UI already changes in a way the user directly caused and can immediately perceive:

| Pattern | Confirmation the user already sees | Bondery examples |
|--------|-------------------------------------|------------------|
| **Navigation after create** | The new screen opens | Mobile: create contact sheet → `/contact/[id]` |
| **Inline control update** | The selected value, toggle, or theme updates on screen | Mobile: theme / language / timezone / swipe-action selects |
| **Optimistic local preference** | The control reflects the new value instantly | Mobile: group sort order (local only) |
| **Sheet closes into updated context** | Parent list or detail already shows the new state | Social link saved on contact detail |

**Rule:** If the user can answer "did it work?" by looking at the screen they are already on, do **not** also show "Saved", "Success", or "Updated".

### Still show feedback when

| Situation | What to show |
|-----------|----------------|
| **The action failed** | Error toast or inline error (always) |
| **Success is invisible** | Background sync, **copy to clipboard**, email sent, export downloaded |
| **Success is easy to miss** | Subtle change off-screen, no navigation, no control update |
| **Destructive or irreversible** | Optional brief confirmation before; error if it fails |

Errors always need explicit feedback because the UI often stays unchanged on failure.

**Copy buttons:** Clipboard actions have no visible UI change — always show a brief success toast (e.g. "Color code copied to clipboard"). Show an error toast if the copy fails.

### Implementation notes

- **Mobile:** Use `useAppToast` for errors and invisible successes only — including **all copy-to-clipboard actions**. Prefer navigation, sheet dismiss, or updated control state for visible successes that are already on screen.
- **Webapp:** Same rule for Mantine `notifications` — e.g. `AddContactModal` navigates to the person page; a success notification would be redundant.
- **Settings:** Changing a select/toggle is self-confirming. Revert the control and show an error if the API call fails.
- **Avoid double confirmation:** Do not combine "navigate to result" **and** "success toast" for the same action.

### Quick check before adding a success toast

Ask:

1. Does the screen or control already show the outcome?
2. Did we navigate the user to the result?
3. Would the toast only repeat what they already know?

If yes to any of those, skip the success notification.

---

## Progressive disclosure — start minimal, reveal on demand

Never ask for information you can derive, delay, or make optional. Show the minimum that unblocks the user. Let them add complexity when they choose to.

### Decision rules

| Question | Answer | Pattern |
|----------|--------|---------|
| Can you derive it from what you already have? | Yes | Do it silently — no extra field |
| Is it optional and rarely set at creation? | Yes | Put it behind an edit flow, not the create flow |
| Is it required before the user can proceed? | Yes | Ask for it at that exact moment, no earlier |

**Bondery examples:**

- **Contact creation** — one "Full name" field. The helper derives `firstName / middleName / lastName` behind the scenes. LinkedIn, phone, birthday live in the detail edit view, not the creation sheet.
- **Social link add** — pick platform first, then type the handle. Selecting the platform reveals the relevant input rather than showing all inputs upfront.

### What to avoid

- Forms that ask for everything "just in case" — most optional fields will never be filled.
- Multi-step wizards for actions where a single, well-labelled field is enough.
- Surfacing advanced options alongside basic ones — put them behind "More options" or in a dedicated settings section.

---

## Destructive actions — calibrate friction to reversibility

Friction on a destructive action should match its consequences, not developer preference or convenience.

### Decision table

| Situation | Pattern |
|-----------|---------|
| **Hard delete, no undo** (contact, account, group) | Two-step: overflow menu → confirm dialog with explicit warning copy |
| **Soft remove or easily reversed** (remove a social link, clear a field) | Do it directly; offer undo via toast if feasible |
| **Batch delete** | Always confirm — high consequence, easy to mis-trigger |
| **Action inside a sheet** | Confirm in the same sheet; do not push a new screen just for a confirm dialog |

### Confirm dialog copy rules

- **Title:** name the thing being destroyed ("Delete [Name]?"), not a generic "Are you sure?"
- **Body:** one sentence explaining what is permanent ("This contact and all their data will be permanently removed.")
- **Button:** label the destructive button with the action ("Delete"), not "OK" or "Yes"
- **Button style:** use the destructive style (red on iOS, `tone="danger"` in the webapp)

### What to avoid

- Confirming easily reversible actions (removing a tag, toggling a preference) — friction here trains users to ignore dialogs.
- Confirming without explaining consequences — "Are you sure?" alone is not enough.
- Skipping confirmation for hard deletes because "the user just pressed the button" — one extra tap is worth it.

---

## Autofocus and keyboard intent

When the user opens a sheet or modal to type something, they must never have to tap an input to start typing. Making a user tap twice to do one thing is broken UX.

### Rule

Any sheet or modal whose primary purpose is text input must autofocus that input after the open animation completes.

### Implementation (mobile)

Use `UI_TIMING_MS.sheetFocusDelay` from `lib/config` to delay focus until the sheet animation has settled:

```tsx
const inputRef = useRef<TextInput>(null);

useEffect(() => {
  if (!open) return;
  const timer = setTimeout(() => {
    inputRef.current?.focus();
  }, UI_TIMING_MS.sheetFocusDelay);
  return () => clearTimeout(timer);
}, [open]);
```

Also reset form state on open so a re-opened sheet is always clean:

```tsx
useEffect(() => {
  if (!open) return;
  setValue("");
  setError(null);
}, [open]);
```

### Implementation (webapp)

Use Mantine's `autoFocus` prop on the first input in a modal, or `useFocusTrap` when the built-in trap is not sufficient.

### Return key — submit from the keyboard (mobile action sheets)

On form action sheets, the **Done key on the system keyboard** should run the same handler as the primary filled button (Add, Save, Create). Do **not** add a floating toolbar above the keyboard — use the native IME action only.

#### When to wire it

| Wire Done → submit | Do not wire |
|--------------------|-------------|
| Create contact, add/edit social, email, phone | Search/filter fields (`SettingsSelect` search) |
| Any `ActionSheetPopup` with a single primary submit | Confirm-only sheets (delete, no inputs) |

#### Implementation

Use `returnKeyType="done"`, `enterKeyHint="done"`, and `onSubmitEditing` on the field. Call the **same** handler as the primary action; respect `canSubmit` / guards inside that handler:

```tsx
<MobileTextInput
  ref={inputRef}
  value={value}
  onChangeText={setValue}
  returnKeyType="done"
  enterKeyHint="done"
  onSubmitEditing={handleSave}
  editable={!isSubmitting}
/>

const primaryAction = {
  label: t("ContactInfo.AddEmail"),
  onPress: handleSave,
  disabled: !canSubmit,
  loading: isSubmitting,
  tone: "primary",
  variant: "filled",
};
```

For masked phone inputs, forward the same props through `MaskedPhoneInput`.

#### Platform notes

- Works on **iOS and Android** for `default`, `email-address`, and `url` keyboards.
- **`phone-pad`** often has no Done key — the sheet button remains the fallback; still set `returnKeyType` for keyboards that support it.
- Do not use `KeyboardToolbar` for standard form sheets unless explicitly designing an accessory bar.

#### What to avoid

- A separate floating Done bar above the keyboard when the IME already exposes Done.
- Submitting on Done when the primary button would be disabled — guard in `handleSave` with `if (!canSubmit) return`.
- Different validation logic on keyboard submit vs button tap — one handler, two triggers.

### What to avoid

- Relying on the OS to auto-focus — sheet animations prevent this on iOS without an explicit delay.
- Re-focusing on every render — gate the focus `useEffect` on the `open` flag changing to `true`.
- Forgetting to clear state on re-open — stale values or errors from a previous session are confusing.

---

## Modals — no dismiss during blocking state

When a modal is **submitting**, **loading**, or otherwise in a **blocking state** (an async action is in flight), the user must not be able to dismiss it. Closing mid-action can leave partial server work, orphaned requests, or UI that no longer matches what is still running on the server.

Web vocabulary: **`isBlocking`** (same rule as mobile **`isBusy`** on `ActionSheetPopup`).

### Rule

While blocking:

- Hide the **X** close button.
- Disable **click outside** to dismiss.
- Disable **Escape** to dismiss.

Re-enable all three when the action finishes (success or error). Cancel buttons that explicitly abort a safe operation are fine when they are part of the footer — the point is to prevent accidental dismiss via chrome gestures while work is in progress.

Derive blocking from submit **and** load/parse/import states — not submit alone.

### Implementation (webapp)

**Open imperatively only** — `open*Modal()` + `modals.open`. Do not use `<Modal>` in feature code. The onboarding wizard shell (`OnboardingFlow`) is the only documented exception. Photo upload closes before async work continues in a notification.

**Lock dismiss chrome** with `useModalBlocking` from `@/lib/modals`:

```tsx
const isBlocking = isSubmitting || isLoading || mutation.isPending;
useModalBlocking(modalId, isBlocking);
```

Never call `modals.updateModal` for dismiss flags in feature code. Title/size-only `updateModal` is allowlisted in rare cases (import preview sizing, API key reveal step).

**Open helper pattern:**

```tsx
export function openMyFeatureModal() {
  const modalId = createModalId("my-feature");
  modals.open({
    modalId,
    title: <ModalTitle ... />,
    children: <MyFeatureModalBody modalId={modalId} />,
  });
}
```

See `apps/webapp/src/lib/modals/README.md`. CI enforces via `npm run check-modal-patterns:strict`.

### What to avoid

- Leaving the X visible while `actionLoading` is true on the footer — users will close and lose context.
- Only disabling the submit button without locking dismiss — both are required.
- Forgetting to restore closability after an error — the user should be able to leave once the request has settled.
- Passing `onClose` props that disable blocking logic, or nesting a second `<Modal>` instead of stacking `modals.open`.

---

## Forms — disable submit until valid

Do not let users submit a form that cannot succeed. The primary action should stay disabled until every required field passes validation. This is clearer than accepting a tap and showing an error toast.

### Rule

- **Required fields:** disable Save / Add until all required values are non-empty and pass format checks (e.g. email regex, phone digits after mask).
- **Inline errors:** show field-level errors only after blur or an explicit submit attempt when that pattern already exists — do not duplicate with a disabled button *and* a red field on first keystroke.
- **Sheets:** apply the same rule to `ActionSheetPopup` primary actions via `disabled: !canSubmit`.

### Implementation (mobile)

Derive `canSubmit` during render from current field state:

```tsx
const trimmedValue = value.trim();
const canSubmit = trimmedValue.length > 0 && EMAIL_REGEX.test(trimmedValue);

const primaryAction = {
  label: t("ContactInfo.AddEmail"),
  onPress: handleSave,
  disabled: !canSubmit,
  loading: isSubmitting,
};
```

For masked phone inputs, validate the unmasked digit string, not the formatted display value.

### Phone number entry (mobile)

- **Layout:** country code picker and number field on **one row** (prefix ~108px, number flexes) — match the webapp inline pattern.
- **Prefix copy:** label the picker for accessibility as **"Country code"**, not the section name ("Phones"). Search placeholder: **"Search country or code"**, not "Phone number".
- **Number copy:** placeholder **"Phone number"** on the digit field only.

### What to avoid

- Enabling submit and rejecting in `handleSave` with only a toast — the button should have been disabled.
- Disabling submit while `loading` without also showing the loading state on the button.
- Validating on every keystroke with aggressive error copy before the user finishes typing (unless the field is already invalid and blurred).

---

## Mobile settings — live previews

Settings that change **how something looks or is ordered elsewhere in the app** should include a **Preview** section on the same screen. The user should see the effect immediately — not by navigating back to Contacts or a contact profile.

### When to add a preview

| Add preview | Skip preview |
|-------------|--------------|
| Sort order (groups, tags) — affects chip rows elsewhere | Setting is already fully visible on the same screen (e.g. theme re-colors the whole app) |
| Swipe actions — gesture + icons are not obvious from the select alone | Simple toggles with no downstream UI |
| Language / timezone / time format — effect appears on dates across the app | Account actions (sign out, delete) |

**Rule:** If changing the control does not make the outcome obvious on the settings screen itself, add a preview.

### Preview section structure

Always use this order (implemented as `SettingsPreviewSection`):

1. **Title** — short label: **"Preview"**
2. **Hint** — one muted sentence below the title explaining what the preview shows
3. **Preview component** — live UI that updates when the control changes (reuse production components where possible)

```tsx
<SettingsPreviewSection caption={t("MobileApp.Settings.PreviewHintGroups")}>
  <ContactsGroupsHeader layout="chipRow" groups={previewGroups} isClickable={false} />
</SettingsPreviewSection>
```

### Hint copy

- Describe **where** the setting applies in the product, not implementation details.
- Tags sort order → chip order on **contact profiles**
- Groups sort → chip row on **Contacts**.
- Swipe actions → note that preview swipes do not run real actions.

### Loading and errors in previews

When preview content is loaded from the API, wrap only the preview (or the whole fetched block) in `SettingsAsyncState`:

- **Loading** — spinner in the preview area; local controls (e.g. sort select) stay visible when possible.
- **Error** — card with bug icon, title, description, and **Retry** on the right.
- **Success** — render preview children.

Screens that fetch on load (tags, groups, account, language) should all use `SettingsAsyncState`. Screens with no initial fetch (swipe actions, theme) do not need it.

### What to avoid

- Long preview titles ("Preview of sorted groups") — use **Preview** + hint instead.
- Hint below the preview component — it belongs **below the title**, above the preview.
- Success toasts when the preview already updated — the preview **is** the confirmation.
- Blocking the entire settings screen on load when only the preview needs network data — keep local prefs editable.
