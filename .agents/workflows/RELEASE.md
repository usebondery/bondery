---
name: Release Workflow
description: Technical release process — versioning, prerequisites, and deployment.
triggers:
  - new monthly release
  - patch / hotfix
related:
  - blog/BLOG-POST.md
---

# Release Workflow

## Versioning

Format: `X.Y.Z`

| Segment | Meaning | Example |
|---------|---------|---------|
| **X** | Year offset from 2025 (2026 = 1, 2027 = 2, …) | `1` |
| **Y** | Month (1 = January, 2 = February, …) | `3` |
| **Z** | Patch within that month (starts at 0) | `0` |

Examples: first release in Jan 2026 → `1.1.0`, second → `1.1.1`, first in Feb 2026 → `1.2.0`.

## Commit Messages

Follow the [commit message guidelines](../../.github/instructions/changelog.instructions.md) so the changelog can be generated correctly.

---

## Prerequisites (on `main`)

Complete all of the following **before** pushing anything to the `release` branch:

1. **Bump version numbers** in every `package.json` across the monorepo.
   ```
   root package.json
   apps/api/package.json
   apps/chrome-extension/package.json
   apps/supabase-db/package.json
   apps/webapp/package.json
   apps/website/package.json
   packages/branding/package.json
   packages/emails/package.json
   packages/helpers/package.json
   packages/mantine-next/package.json
   packages/translations/package.json
   packages/types/package.json
   packages/vcard/package.json
   ```
2. **Update the minimum Extension version** in the packages/helpers package. The const to update is `MIN_EXTENSION_VERSION` in `packages/helpers/src/constants.ts`. This ensures users are prompted to update if they have an incompatible extension version.
3. **Update CHANGELOG.md** — add a new version section following the [changelog format](../../.github/instructions/changelog.instructions.md).
4. **Generate the OpenAPI spec** and commit the output. This keeps API docs and client SDKs in sync.
   ```bash
   npm run generate-openapi
   ```
5. **Generate Supabase TypeScript types** from the local database and commit the output. This ensures `supabase.types.ts` reflects the current schema and all RPC signatures.
   ```bash
   npm run generate-types
   ```
   > Requires the local Supabase instance to be running (`npm run dev:supabase`).
6. **Build all packages and apps** (`turbo build`) and verify there are no errors.
7. **Commit** everything to `main`.

---

## Release Steps

> **CRITICAL ORDERING RULE FOR AI AGENTS AND HUMANS ALIKE:**
> Steps 1 and 2 are SEQUENTIAL and BLOCKING. You MUST NOT push to the `release` branch until you have received explicit confirmation from the user that the Chrome extension has been approved and published by Google. Doing so deploys the web app to production before users have the updated extension, which breaks API version gating.

### 1. Chrome Extension (if changed)

The Chrome extension must be released **before** the web app because Google requires a manual review.

1. Create and push the extension git tag:
   ```bash
   git tag ext-vX.Y.Z
   git push origin ext-vX.Y.Z
   ```
   This triggers the `release-extension` GitHub Actions workflow automatically. You can also trigger it manually — see [apps/chrome-extension/RELEASE.md](../../apps/chrome-extension/RELEASE.md) for details.
2. **STOP. Do not continue to Step 2.** Wait for the user to confirm that Google's review is complete and the extension is live in the Chrome Web Store.
3. Once the user confirms the extension is published, proceed to Step 2.

> **If the review is rejected:** fix the issues on `main`, create a new patch tag (`ext-vX.Y.Z+1`), and re-submit. Do **not** proceed with the web app release until the extension is live.

### 2. Web App & Other Apps

> **GATE: Only execute this step after the user has explicitly confirmed the Chrome extension is live.**

1. Verify all [prerequisites](#prerequisites-on-main) are complete.
2. Push `main` to the `release` branch:
   ```bash
   git push origin main:release
   ```
   The deployment workflow triggers automatically.

---

## Patch / Hotfix Release

For urgent fixes between monthly releases:

1. Fix the issue on `main`.
2. Bump only the **Z** segment (e.g. `1.3.0` → `1.3.1`).
3. Follow the same [prerequisites](#prerequisites-on-main) and [release steps](#release-steps) above.

> **Tip:** Keep hotfixes small. Avoid bundling listing or permission changes with code fixes (especially for the Chrome extension — see tips in [apps/chrome-extension/RELEASE.md](../../apps/chrome-extension/RELEASE.md)).

---

## Post-Release: Announce to Users

Once the technical deploy is confirmed working:

1. Write and publish a blog post about the release — follow the [Blog Post Workflow](blog/BLOG-POST.md).
2. Announce on Discord and Reddit using the announce CLI.
3. (Future) Trigger the in-app notification for the new version.

---

## Rollback

If a release introduces a critical issue:

1. Revert the faulty commits on `main`.
2. Create a new patch release following the hotfix flow above.
3. For the Chrome extension, submit a new version — you cannot unpublish a Chrome Web Store update.