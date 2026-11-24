# OpenAI portal submit

This file is a human checklist. This change does not implement the portal.

`pnpm run pack:openai-plugin` writes a gitignored ZIP. Do not commit that ZIP. Package limits are in [openai-package.md](./openai-package.md).

## Before submit

Use a verified individual identity or a verified business identity.

The OpenAI project must use global data residency. When the project uses EU data residency, the portal cannot accept an MCP plugin.

Before submit, the site must serve the challenge token as plain text. Use `https://api.usebondery.com/.well-known/openai-apps-challenge` or `usebondery.com`. Do not add that route in the plugin package. Record the route as a follow-up.

Prepare five positive cases and three negative cases. Store those cases in `plugin.config.json`.

Add a demo video URL before submit. The builder omits an empty `demo_recording_url`.

Give the reviewer an account with sample data. Do not enable MFA on that account. Do not require an email code. Do not require a magic link.

## Commerce ban

Do not mention the $10 plan in the listing or in a skill. Do not mention the trial in the listing or in a skill. Do not put a checkout link in the listing or in a skill.

A reviewer may authenticate with an existing paid account.

Policy wording stays in [bondery-legal](../../bondery-legal/SKILL.md).

## After publish

OpenAI scans tool changes from the live server. A skill change needs a new ZIP. A metadata change needs a new ZIP.

Do not change the MCP URL in the update flow.

A human runs Portal Submit. A human runs Portal Publish.

## Checklist

- [ ] The identity is a verified individual or a verified business
- [ ] The OpenAI project uses global data residency
- [ ] The challenge token is served as plain text, and the route is not part of this package
- [ ] Five positive cases and three negative cases are in the config
- [ ] A demo video URL is ready before submit, and an empty `demo_recording_url` stays omitted
- [ ] The reviewer account has sample data, no MFA, no email code, and no magic link
- [ ] The listing and skills omit the $10 plan, the trial, and any checkout link
- [ ] Tool updates rely on the live server scan
- [ ] A skill or metadata change ships as a new ZIP
- [ ] The MCP URL stays unchanged in the update flow
- [ ] The ZIP from `pnpm run pack:openai-plugin` is not committed
