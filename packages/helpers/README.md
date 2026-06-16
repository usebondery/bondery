# @bondery/helpers

Shared helper functions and utilities for the Bondery monorepo.

## Module Entry Points

- `@bondery/helpers` - curated flat API for common imports.
- `@bondery/helpers/globals` - routes, app links, product metadata, important date labels.
- `@bondery/helpers/platform` - social platform URL details and parser helpers.
- `@bondery/helpers/name` - name cleaning and parsing helpers.
- `@bondery/helpers/address` - address and location formatting helpers.
- `@bondery/helpers/date` - date range and duration formatting helpers.
- `@bondery/helpers/text` - inline token parsing and reading-time helpers.
- `@bondery/helpers/version` - semantic version comparison helpers.
- `@bondery/helpers/interactions` - interaction type constants.
- `@bondery/helpers/env` - environment variable checks.

## Usage

```typescript
import { checkEnvVariables } from "@bondery/helpers/env";
import { API_ROUTES } from "@bondery/helpers/globals";
import { parseInstagramUsername } from "@bondery/helpers/platform";

checkEnvVariables({
  environment: "production",
  appPath: __dirname,
  requiredVars: ["API_URL", "API_KEY"],
});

console.log(API_ROUTES.CONTACTS_IMPORT_INSTAGRAM);
console.log(parseInstagramUsername({ username: "alex.novak" }));
```
