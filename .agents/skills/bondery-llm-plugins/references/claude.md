# Claude package

The builder writes `llm-plugins/claude`. Do not edit that folder. Source rules are in [source-config.md](./source-config.md). The branch rule below is the Claude publish contract. Other tag gates stay in [bondery-release](../../bondery-release/SKILL.md). The workflow row is in [ci-triggers.md](../../bondery-release/references/ci-triggers.md).

## Output contract

The generated tree includes:

- `.claude-plugin/plugin.json`
- `.mcp.json`
- rendered skills
- the rendered readme
- the copied `LICENSE`
- `assets/icon.png`

The builder writes `version` from the root `package.json`.

`.mcp.json` uses server name `bondery`, `type` `http`, and `https://api.usebondery.com/mcp`.

Set these listing keys:

- `icon` as `./assets/icon.png`
- `documentationUrl`
- `supportUrl`
- `privacyPolicyUrl`
- `termsOfServiceUrl`

Do not add a component key.

## Directory source

The Claude directory submission tracks the `release` branch, plugin path `llm-plugins/claude`. `release` holds production code only, so the directory reads the plugin of the current production release. No workflow publishes the plugin.

Each push to `release` that changes `llm-plugins/claude` opens a new directory version. A production release changes the `version` field, so each production release opens one. A pushed commit replaces an open version and ends an open appeal on it.

Do not point the submission at `main`. `main` carries unreleased code.

A human runs Portal Submit. A human runs Portal Publish.

## Connect text

Claude connect text may name Claude. Claude connect text may include `Use Claude's published identity`.

Put that text inside the connect block. The OpenAI replacement of the block must not contain the word Claude. Text rules are in [guidelines.md](./guidelines.md).

## Checklist

- [ ] Output has `.claude-plugin/plugin.json` and `.mcp.json`
- [ ] `.mcp.json` uses `type` `http`
- [ ] Listing keys are `icon`, `documentationUrl`, `supportUrl`, `privacyPolicyUrl`, and `termsOfServiceUrl`
- [ ] The manifest has no component key
- [ ] `version` matches the root `package.json`
- [ ] The directory submission tracks `release` with plugin path `llm-plugins/claude`
- [ ] No open appeal is pending when a production release is pushed to `release`
- [ ] Portal Submit and Portal Publish stay human
- [ ] Claude naming stays inside the connect block
