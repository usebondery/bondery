# Flaky tests

Strategies for identifying, fixing, and quarantining unstable E2E specs.

## Identify flakiness

```bash
# Repeat a spec many times locally
pnpm exec playwright test -c apps/webapp/e2e/playwright.config.mjs login.unauth --repeat-each=10

# With retries to see pass-after-retry
pnpm exec playwright test -c apps/webapp/e2e/playwright.config.mjs --retries=3
```

If a test passes inconsistently, treat it as flaky — do not merge until fixed or quarantined.

## Quarantine

```typescript
test('flaky: logout clears session', async ({ page }) => {
  test.fixme(true, 'Flaky — Plane BON-123')
  // ...
})

// Or skip only in CI while investigating
test('conditional', async ({ page }) => {
  test.skip(Boolean(process.env.CI), 'Flaky in CI — Plane BON-123')
})
```

Always link a tracking issue. Remove quarantine in the same PR that fixes root cause.

## Common causes in Bondery

### Race conditions

```typescript
// Bad
await page.click('[data-testid="login-github"]')

// Good — Playwright auto-waits
await page.getByTestId('login-github').click()
```

### Arbitrary timeouts

```typescript
// Bad
await page.waitForTimeout(5000)

// Good
await page.waitForURL(/\/app\//, { timeout: 300_000 })
await expect(page.getByTestId('login-github')).toBeVisible()
```

### OAuth / external redirects

GitHub login is inherently slow and environment-dependent. Use:

- `github-login` project with extended timeout (`300_000` ms in config)
- `auth` project with email `storageState` (`.auth/email-user.json`) for in-app specs that do not need GitHub
- `setup` only when the spec must capture GitHub `storageState`

### Missing stack

Playwright does not start the API or webapp. If health probes fail, start `pnpm run start:mailpit` and `pnpm run dev:webapp-api`.

### Stale GitHub auth state

GitHub OAuth regression (`github-login` / `auth.setup.ts`) fails when `.auth/user.json` is missing or expired. Re-run:

```bash
pnpm run test:e2e:auth-setup -w webapp -- --headed
```

In-app `auth` specs use `.auth/email-user.json` from `email-setup`. Delete that file if the shared session is stale, then re-run `--project=auth`. Do not log out in `auth` specs.

## Retries

Webapp config: `retries: process.env.CI ? 1 : 0`. Retries mask flakiness — use for CI stability, not as a substitute for fixing tests.

## Flaky test checklist

- [ ] Root cause identified (not just "added retry")
- [ ] `test.fixme` or `test.skip` has issue link if not fixed in same PR
- [ ] No new `waitForTimeout` introduced
- [ ] OAuth-dependent specs use correct project and timeout
- [ ] Auth storage refreshed when session specs fail consistently
