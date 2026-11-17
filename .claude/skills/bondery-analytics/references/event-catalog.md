# Event catalog

Living list of product analytics events. **Canonical names** use PostHog `category:object_action`.

## Canonical events

| Event | Properties | Capture | Notes |
|-------|------------|---------|-------|
| `contacts:contact_create` | — | client | After successful create |
| `contacts:contact_delete` | — | client | Single contact delete |
| `contacts:bulk_delete` | `item_count` | client | Bulk delete |
| `tags:tag_create` | — | client | |
| `tags:tag_update` | — | client | |
| `tags:tag_delete` | — | client | |
| `groups:group_create` | — | client | |
| `groups:group_delete` | — | client | |
| `interactions:interaction_create` | `activity_type`, `participant_count` | client | |
| `interactions:interaction_update` | `activity_type`, `participant_count` | client | |
| `enrichment:batch_start` | `eligible_count` | client | Extension batch enrich |
| `enrichment:batch_end` | `total_enriched` | client | Batch complete |
| `enrichment:contact_update` | `source: "linkedin"` | client | Single LinkedIn enrich |
| `feedback:nps_submit` | `score`, `has_general_feedback`, `has_reason` | client | After API success |
| `signup_flow:user_create` | `signup_method`: `github` \| `linkedin` \| `email` \| `unknown` | **server** | First OAuth account (`account.create`) or magic-link signup (`user.create` when verify created the user — no `Account` row) |
| `signup_flow:onboarding_complete` | — | **server** | First onboarding completion |
| `signup_flow:activation_complete` | `activation_type` | **server** | One-shot per milestone |
| `account_settings:account_delete` | — | **server** | Before account teardown |
| `account_settings:export_view` | `entry_point`: `settings` \| `command_palette` | client | Export modal opened |
| `account_settings:export_start` | — | client | User starts ZIP generation |
| `account_settings:export_generate` | `people_count`, `groups_count`, `tags_count`, `interactions_count`, `is_empty` | **server** | ZIP generated (counts only, no PII) |
| `account_settings:export_fail` | `error_code` | client | Generation or download failed |
| `account_settings:export_cancel` | — | client | User cancelled while generating |
| `account_settings:import_view` | `entry_point`: `settings` \| `command_palette` | client | Bondery ZIP import modal opened |
| `account_settings:import_start` | — | client | User starts applying a Bondery export ZIP |
| `account_settings:import_generate` | `people_count`, `groups_count`, `tags_count`, `interactions_count`, `is_empty` | **server** | ZIP applied (counts only, no PII) |
| `account_settings:import_fail` | `error_code` | client | Peek, apply, or timeout failed |
| `account_settings:import_cancel` | — | client | User cancelled while checking or importing |
| `account_settings:passkey_add` | — | client | Settings: passkey registered |
| `account_settings:passkey_fail` | — | client | Settings: add/update ceremony failed (not cancel) |
| `account_settings:passkey_cancel` | — | client | Settings: OS sheet dismissed |
| `account_settings:passkey_update` | — | client | Settings: passkey renamed |
| `account_settings:passkey_delete` | — | client | Settings: passkey removed |
| `auth:session_create` | `login_method`: `passkey` \| `oauth_github` \| `oauth_linkedin` \| `email` (optional) | client | Once per browser tab session |
| `auth:session_end` | — | client | On logout / session end |
| `auth:passkey_fail` | — | client | Login passkey ceremony failed (not cancel) |
| `auth:passkey_cancel` | — | client | Login OS sheet dismissed |
| `imports:import_complete` | `import_source`, `item_count`, `is_first_import` | client | Import modal success |
| `billing:subscription_create` | `plan_interval`, `plan_tier`, `cancel_at_period_end` | **server** | Stripe webhook |
| `billing:subscription_cancel` | `plan_interval`, `plan_tier`, `cancel_at_period_end` | **server** | Stripe webhook |

### `activation_type` values

`first_contact` | `first_import` | `first_interaction` | `first_group`

### `import_source` values

`linkedin` | `instagram` | `vcard` | `bondery_export`

## Plausible (website)

Plausible does not use custom event names in product code — automatic pageviews only.

## Adding an event

1. Pick `category:object_action` per [naming-and-schema.md](./naming-and-schema.md).
2. Add a row to the canonical table above.
3. Implement via wrappers in [posthog-capture.md](./posthog-capture.md).
4. Verify per [verification.md](./verification.md).
