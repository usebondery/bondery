# Phone helpers

Use `normalizePhoneInput` / `normalizePhoneParts` on write paths (API, import, blur/commit in UI).

- **National input** needs `defaultCountry` (ISO-3166 alpha-2 from `user_settings.default_phone_country`, seeded from timezone on signup, PATCH, and `release-migrate` backfill).
- **International input** (`+` or `00`) ignores default country.
- **Merge/dedup** uses `phoneIdentityKey(prefix, value)` (digits only).

Do not use greedy `parsePhoneNumber` without `defaultCountry` for national numbers.
