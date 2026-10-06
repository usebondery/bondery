# CI and artifacts

CI for webapp E2E is not yet wired in `.github/workflows/`. Follow these conventions when adding it.

## Recommended CI job shape

```yaml
# .github/workflows/e2e-webapp.yml (future)
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: ./.github/actions/shared/setup-pnpm
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm run start:mailpit && pnpm run dev:webapp-api
      - run: pnpm run test:e2e -w webapp -- --project=unauth --project=oauth-callback --project=auth
        env:
          BONDERY_PUBLIC_API_URL: http://127.0.0.1:26631
          BONDERY_PUBLIC_WEBAPP_URL: http://127.0.0.1:26632
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: apps/webapp/e2e/test-results/
          retention-days: 14
```

**CI scope today:** prefer `unauth` + `oauth-callback` + email-authenticated `auth` specs — no GitHub secrets or `.auth/user.json`. The `auth` project uses Mailpit magic-link `storageState` (`.auth/email-user.json`). A future job also needs Mailpit on `127.0.0.1:26641` and loopback SMTP. There is no GitHub Actions E2E job yet.

**GitHub login in CI:** optional. It needs GitHub test credentials, encrypted secrets, and `auth.setup.ts` — treat as a separate milestone.

## Reporters

Current config: `reporter: [["list"]]`.

When adding CI, consider:

```typescript
reporter: process.env.CI
  ? [["github"], ["html", { open: "never" }]]
  : [["list"]],
```

## Artifacts (Playwright built-in)

Configured in `playwright.config.mjs`:

| Artifact | Setting | When |
|----------|---------|------|
| Trace | `trace: "on-first-retry"` | Failed retry in CI |
| Screenshot | `screenshot: "only-on-failure"` | `github-login` project |
| Video | `video: "retain-on-failure"` | `github-login` project |

Output under `apps/webapp/e2e/test-results/` (gitignored).

## Environment variables

| Variable | Purpose |
|----------|---------|
| `CI` | Enables `forbidOnly`, retries |
| `E2E_PAUSE_GITHUB` | `page.pause()` in GitHub login spec |
| `E2E_PUBLIC_HOST` | Optional. Must match `BONDERY_PUBLIC_*` hosts when set |
| `BONDERY_PUBLIC_API_URL` | Source of Playwright API health URL and cookie domain |
| `BONDERY_PUBLIC_WEBAPP_URL` | Source of Playwright `baseURL` and webapp health URL |

## Secrets

Never commit OAuth client secrets or `.auth/user.json`. CI jobs that need GitHub login must use GitHub Actions secrets and document rotation.

## CI checklist

- [ ] CI runs `unauth`, `oauth-callback`, and email-authenticated `auth` without GitHub secrets
- [ ] GitHub login stays optional unless secrets are configured
- [ ] `forbidOnly: true` in CI (`test.only` fails build)
- [ ] Failure artifacts uploaded (trace, screenshot)
- [ ] Env URLs use `127.0.0.1` matching local e2e config
- [ ] Job documented in skill or `apps/webapp/e2e/playwright.config.mjs` header
