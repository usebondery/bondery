# @bondery/helpers

Shared runtime utilities and form normalization pipelines for Bondery.

This is the **behavior layer**: parsing, formatting, geocoding helpers, route constants, and Zod pipelines that combine schema validation with normalization. It depends on `@bondery/schemas` for canonical types.

## When to import from where

| Need | Import from |
|------|-------------|
| Entity type or API validation schema | `@bondery/schemas` |
| Format, parse, or transform utility | `@bondery/helpers` or a subpath |
| Form submit (validate + normalize in one step) | `@bondery/helpers/forms` |

## Form pipelines (`@bondery/helpers/forms`)

Use on save/submit handlers when the UI collects raw user input:

- `createContactFromFullNameSchema` — `{ fullName }` → `{ firstName, middleName, lastName }`
- `normalizedSocialHandleSchema` — `{ platform, value }` → normalized stored value

Keep live field validation on `@bondery/schemas` input schemas (for example `createContactInputSchema`, `socialHandleInputSchema`).

```typescript
import { createContactInputSchema } from "@bondery/schemas";
import { createContactFromFullNameSchema } from "@bondery/helpers/forms";

// Live form validation
createContactInputSchema.parse({ fullName: values.fullName });

// Submit
const names = createContactFromFullNameSchema.parse({ fullName: values.fullName });
```

## Module entry points

- `@bondery/helpers` — curated flat API for common imports
- `@bondery/helpers/forms` — validate-then-normalize Zod pipelines
- `@bondery/helpers/globals` — routes, app links, product metadata
- `@bondery/helpers/globals/paths` — `API_ROUTES`, `WEBAPP_ROUTES`, etc.
- `@bondery/helpers/platform` — social platform URL details and parsers
- `@bondery/helpers/name` — name cleaning and parsing
- `@bondery/helpers/address` — address formatting and geocode suggestion mapping
- `@bondery/helpers/date` — date range and duration formatting
- `@bondery/helpers/text` — inline token parsing and reading-time helpers
- `@bondery/helpers/version` — semantic version comparison
- `@bondery/helpers/interactions` — interaction type runtime constants
- `@bondery/helpers/env` — environment variable checks
- `@bondery/helpers/locale` — timezone grouping and formatting
- `@bondery/helpers/socials` — social field normalization utilities
- `@bondery/helpers/phone` — phone parsing and formatting
- `@bondery/helpers/contact` — contact channel type metadata
- `@bondery/helpers/geocode` — geocode query builders
- `@bondery/helpers/emoji` — emoji search data
- `@bondery/helpers/notes` — markdown helpers

## Usage

```typescript
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { parseFullName } from "@bondery/helpers/name";
import { normalizedSocialHandleSchema } from "@bondery/helpers/forms";

console.log(API_ROUTES.CONTACTS);
console.log(parseFullName("Ada Lovelace"));

const social = normalizedSocialHandleSchema.parse({
  platform: "linkedin",
  value: "linkedin.com/in/ada",
});
```
