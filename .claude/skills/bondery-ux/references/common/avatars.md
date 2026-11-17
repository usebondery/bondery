# Avatars and logos

Contact photos live in Supabase Storage at `avatars/{userId}/{personId}.jpg`. The `people.has_avatar` boolean (maintained by API write paths on upload/delete) gates whether the API returns a public URL in `Contact.avatar` or `null`.

## Read path

`resolveContactAvatarUrl()` in the API checks `has_avatar` before constructing the storage URL. Clients should treat `avatar: null` as “show initials” — no phantom requests or 404 fallbacks.

## Write path

All avatar uploads and deletes go through `avatar-storage.ts` helpers that update both storage and `has_avatar` together.

## Components

Use `PersonAvatar` / `ContactAvatar` / Mantine `Avatar` with `name` + `color` for initials fallback when `avatar` is null.

LinkedIn company/school logos use the separate `linkedin-logos` bucket and are unrelated to `has_avatar`.

## Checklist

- [ ] `avatar: null` renders initials — no fetch to storage URL
- [ ] Avatar upload/delete goes through API helpers (updates `has_avatar`)
- [ ] LinkedIn logos not confused with contact avatars
