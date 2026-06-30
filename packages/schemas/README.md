# @bondery/schemas

Canonical types, Zod validation schemas, and constants for Bondery.

This is the **contract layer**: it defines what data is allowed and what shapes cross API, sync, and client boundaries. It does not contain business normalization (name parsing, social URL extraction, geocoding, etc.).

## Dependency rule

`@bondery/schemas` must **not** depend on any other `@bondery/*` package.

Other packages (for example `@bondery/helpers`) may depend on schemas. Apps may depend on both.

## Validation vs normalization

| Concern | Package | Example |
|---------|---------|---------|
| **Validation** — is this input allowed? | `@bondery/schemas` | Required fields, max length, enums, email format |
| **Normalization** — how do we store it consistently? | `@bondery/helpers` | `parseFullName`, `processContactSocialFieldValue` |
| **Form pipelines** — validate then normalize on submit | `@bondery/helpers/forms` | `createContactFromFullNameSchema` |

Schemas may include lightweight structural transforms (trim-to-null, lowercase email, default flags) when they are part of the contract itself.

## Subpath exports

| Import | Contents |
|--------|----------|
| `@bondery/schemas` | Entity schemas, types, shared utilities |
| `@bondery/schemas/http` | Route transport primitives (params, coerced query, pagination), shared response helpers (`okResponse`, `standardErrorResponses`), `contactIdSchema` |
| `@bondery/schemas/constants` | Field limits, product constants |
| `@bondery/schemas/supabase.types` | Generated Supabase `Database` types |
| `@bondery/schemas/database` | Alias for supabase types |
| `@bondery/schemas/sync` | Mobile sync protocol and mutation payloads |

## Usage

```typescript
import { contactSchema, createContactInputSchema, type Contact } from "@bondery/schemas";
import { createContactApiInputSchema, type CreateContactInput } from "@bondery/schemas";

// Read-model validation
const contact = contactSchema.parse(apiResponse.contact);

// Form field validation (live typing)
const input = createContactInputSchema.parse({ fullName: "Ada Lovelace" });

// API / sync create payload (already normalized name parts)
const payload: CreateContactInput = {
  firstName: "Ada",
  lastName: "Lovelace",
};
```

For form submit flows that start from a single full-name field or raw social input, use `@bondery/helpers/forms` instead of combining validation and normalization inside schemas.

## Wire vs form vs read models

| Kind | Location | Used by |
|------|----------|---------|
| **Wire** — HTTP request/response shapes | `@bondery/schemas` (`*ApiInputSchema`, `update*InputSchema`) | API routes, sync mutations |
| **Form** — UI input with transforms (`fullName` → parts) | `@bondery/schemas` (`createContactInputSchema`, etc.) | Mobile/webapp forms only — never route `body` |
| **Transport** — params, coerced query, pagination, response kit | `@bondery/schemas/http` (`uuidParamSchema`, `okResponse`, `contactIdSchema`, …) | Fastify route `params` / `querystring` / `response` composition |
| **Read** — list/detail response items | `@bondery/schemas` (`contactSchema`, `groupSchema`, …) | Route `response` schemas, clients |

OpenAPI documents wire **input** shapes. Zod transforms/refines still run at runtime but may not appear fully in generated docs — behavioral contracts live in `src/contracts.assertions.ts`.

## Scripts

- `npm run build` — compile TypeScript to `dist/`
- `npm run check-types` — typecheck without emit
- `npm run test:contracts` — boundary checks + schema contract assertions
