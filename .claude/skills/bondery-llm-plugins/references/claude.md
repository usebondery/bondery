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

## `claude-plugin` branch

When `llm-plugins/claude` changes, a production tag `vX.Y.Z` may fast-forward `claude-plugin`.

An RC tag never fast-forwards `claude-plugin`.

When the only change under `llm-plugins/claude` is the version field, the publish is a green skip. The check passes. The workflow does not push `claude-plugin`.

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
- [ ] A production tag fast-forward is limited to a real `llm-plugins/claude` change
- [ ] An RC tag does not move `claude-plugin`
- [ ] A version-only bump stays a green skip
- [ ] Portal Submit and Portal Publish stay human
- [ ] Claude naming stays inside the connect block
