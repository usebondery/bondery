# PostHog naming and schema

Bondery follows [PostHog product analytics best practices](https://posthog.com/docs/product-analytics/best-practices) for event and property naming.

## Event names: `category:object_action`

Use the **category:object_action** framework:

| Part | Meaning | Examples |
|------|---------|----------|
| **category** | Context where the event occurred | `contacts`, `signup_flow`, `account_settings`, `enrichment` |
| **object** | Noun — component or location | `contact`, `pricing_page`, `forgot_password_button` |
| **action** | Present-tense verb — what happened | `click`, `create`, `view`, `delete` |

**Full examples (from PostHog):**

- `account_settings:forgot_password_button_click`
- `signup_flow:pricing_page_view`
- `registration:sign_up_button_click`

**Bondery examples:**

- `contacts:contact_create`
- `contacts:contact_delete`
- `tags:tag_update`
- `signup_flow:user_create` (growth event — prefer server capture)
- `feedback:nps_submit`

### Format rules

- **Lowercase only**
- **Snake_case** for category, object, and action segments
- **Colon** separates category from `object_action` (not underscores)
- **Present-tense verbs** for actions
- **Static strings in code** — never interpolate into the event name

```typescript
// Bad — new event definition per page
posthog.capture(`page_viewed_${pageName}`);

// Good — one event, filter by property
captureEvent("navigation:page_view", { page_name: pageName });
```

### Allowed action verbs

Do not invent new verbs without updating this list and `event-catalog.md`:

`click`, `submit`, `create`, `view`, `add`, `invite`, `update`, `delete`, `remove`, `start`, `end`, `cancel`, `fail`, `generate`, `send`

If no verb fits, pick the closest allowed verb and add detail in properties (e.g. `enrichment:contact_update` with `source: "linkedin"`).

### Versioning

When a flow changes materially, version the **category** (not dynamic strings):

- `registration:sign_up_button_click` → `registration_v2:sign_up_button_click`

Preserves historical data while enabling before/after comparison.

## Property names

| Pattern | Examples |
|---------|----------|
| `object_adjective` | `user_id`, `item_count`, `activity_type` |
| `is_*` / `has_*` for booleans | `is_subscribed`, `has_general_feedback` |
| `*_date` / `*_timestamp` for dates | `user_creation_date`, `last_login_timestamp` |

### Property rules

- Property **keys** are static strings — never `feature_${name}_used`
- Put variable values in property **values**: `{ feature_name: "batch_enrich" }`
- High cardinality in property **values** is OK; high cardinality in property **keys** breaks filters and can trigger rate limits

## Categories (Bondery)

Use consistent categories so events group in PostHog:

| Category | Use for |
|----------|---------|
| `contacts` | Contact CRUD, bulk delete |
| `tags` | Tag CRUD |
| `groups` | Group CRUD |
| `interactions` | Activities / interactions |
| `enrichment` | LinkedIn / batch enrich flows |
| `feedback` | NPS, product feedback |
| `signup_flow` | Registration, activation (growth) |
| `account_settings` | Settings, preferences |
| `auth` | Sign-in and session lifecycle |
| `navigation` | Page views, shell navigation |
| `billing` | Subscription, checkout (server-preferred) |

Add a new category only when the context is genuinely distinct — avoid one-off categories.

## Legacy names

Several shipped events omit the `category:` prefix (e.g. `contact_created`). See [event-catalog.md](./event-catalog.md) for the legacy → canonical map. **New events must use `category:object_action`.** Migrate legacy names when touching call sites or in dedicated cleanup PRs.

## Naming checklist

- [ ] Event matches `category:object_action` with an allowed verb
- [ ] Event name is a fixed string literal
- [ ] Property keys are fixed strings; values carry variable data
- [ ] Booleans use `is_*` or `has_*`
- [ ] Entry added to `event-catalog.md`
- [ ] Breaking semantic change uses category version suffix or new event name
