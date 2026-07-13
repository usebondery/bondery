# Settings previews (mobile)

Settings that change **how something looks elsewhere** need a live **Preview** on the same screen.

---

## When to add preview

| Add preview | Skip preview |
|-------------|--------------|
| Sort order (groups, tags) | Theme (whole app updates) |
| Swipe actions | Simple toggles |
| Language / timezone / time format | Sign out, delete account |

**Rule:** If the outcome is not obvious on the settings screen itself, add a preview.

---

## Structure (`SettingsPreviewSection`)

1. **Title** — "Preview"
2. **Hint** — one muted sentence: where this applies in the product
3. **Preview component** — reuse production UI (`ContactsGroupsHeader`, etc.)

---

## Async preview data

Wrap preview fetch in `SettingsAsyncState`:

- **Loading** — spinner in preview only; local controls stay editable
- **Error** — card + Retry
- **Success** — render children

---

## What to avoid

- Hint below preview (belongs under title, above preview).
- Success toast when preview already updated — preview **is** confirmation.
- Blocking whole screen when only preview needs network.
