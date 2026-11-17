---
name: bondery-llm-plugins
description: >
  Builds the Claude plugin and the OpenAI plugin from llm-plugins/src.
  Use when editing llm-plugins, plugin.config.json, the Claude plugin,
  the OpenAI plugin, the ChatGPT plugin, or a directory ZIP.
metadata:
  version: "1.0.0"
  namespace: bondery
---

# Bondery LLM plugins

`llm-plugins/src` is the only edited source. The builder writes two committed packages, `llm-plugins/claude` and `llm-plugins/openai`. Decision record: [ADR 0016](../../../docs/adr/0016-llm-plugin-source.mdx).

## When to use

- Editing `llm-plugins` or `plugin.config.json`
- Changing the Claude plugin or the `claude-plugin` branch
- Changing the OpenAI plugin, the ChatGPT plugin, or a directory ZIP

## Do not use this skill for

- MCP route code in `apps/api`. Read [bondery-api](../bondery-api/SKILL.md). Hint values for skill text are in [guidelines.md](references/guidelines.md).
- Privacy or Terms wording. Read [bondery-legal](../bondery-legal/SKILL.md).
- Tag order past the `claude-plugin` rule. Read [bondery-release](../bondery-release/SKILL.md).
- MCP Inspector steps. Read [Inspect the MCP server](../../../docs/contributing/mcp.mdx).

## Non-negotiables

1. Edit `llm-plugins/src` only. Commit `llm-plugins/claude` and `llm-plugins/openai`. Do not edit the generated folders.
2. After a source edit, run `pnpm run build:llm-plugins`. `pnpm run check:llm-plugins` fails on drift.
3. The root `package.json` supplies the version. Do not add a version key to `llm-plugins/src/plugin.config.json`.
4. Bondery MCP auth is CIMD only. `apps/api/src/lib/auth/create-bondery-auth.ts` sets `allowDynamicClientRegistration` to false. When CIMD fails, OpenAI may use DCR. When connect fails with client registration disabled, that setting is the cause. Token rules stay in [bondery-security](../bondery-security/SKILL.md).
5. Before a directory submit, UserInfo must return `email` and `email_verified` true. `apps/api/src/test/auth-integration.test.ts` checks `sub` only. Do not claim the email fields are done.
6. Do not add a profile tool, a ChatGPT UI, or a domain-challenge route in this package work. Record each item as a follow-up.
7. Do not name the $10 plan in listing copy or in a skill. Do not name the trial in listing copy or in a skill. Policy wording stays in [bondery-legal](../bondery-legal/SKILL.md).
8. A human runs Portal Submit. A human runs Portal Publish. `pnpm run pack:openai-plugin` writes a gitignored ZIP. Do not commit that ZIP.
9. `llm-plugins/` is not a pnpm workspace. `pnpm-workspace.yaml` lists `apps/*` and `packages/*` only.

## Follow-ups

Do not implement these items in the package change.

- UserInfo `email` and `email_verified` true. The auth integration test checks `sub` only.
- A profile tool.
- A ChatGPT UI.
- A route for the OpenAI domain challenge. The portal need is in [openai-submission.md](references/openai-submission.md).

## Decision tree

Read the file in the Read column when the task matches.

| Task | Read |
|------|------|
| Source tree, host output, builder, or drift check | [references/architecture.md](references/architecture.md) |
| `plugin.config.json` or a manifest field | [references/source-config.md](references/source-config.md) |
| Claude output or the `claude-plugin` branch | [references/claude.md](references/claude.md) |
| OpenAI package limits or ZIP contents | [references/openai-package.md](references/openai-package.md) |
| Human OpenAI portal submit | [references/openai-submission.md](references/openai-submission.md) |
| Skill text, connect copy, or tool hints | [references/guidelines.md](references/guidelines.md) |
| Index of every reference | [references/README.md](references/README.md) |
| Privacy, Terms, or a policy claim | [bondery-legal](../bondery-legal/SKILL.md) |
| OAuth, secrets, or tenant isolation | [bondery-security](../bondery-security/SKILL.md) |
| Tags, deploy pins, or the release gate | [bondery-release](../bondery-release/SKILL.md) |
| A user-visible changelog entry | [bondery-changelog](../bondery-changelog/SKILL.md) |
| Local MCP Inspector | [docs/contributing/mcp.mdx](../../../docs/contributing/mcp.mdx) |
| Why one source writes two packages | [ADR 0016](../../../docs/adr/0016-llm-plugin-source.mdx) |

## Pre-ship checklist

- [ ] Edits are in `llm-plugins/src` only
- [ ] `pnpm run build:llm-plugins` has run
- [ ] `llm-plugins/claude` and `llm-plugins/openai` are committed with the source
- [ ] The builder is the only writer of the generated folders
- [ ] `pnpm run check:llm-plugins` passes
- [ ] `plugin.config.json` has no version key
- [ ] The generated version matches the root `package.json`
- [ ] OpenAI skill bodies do not contain the word Claude
- [ ] Listing copy does not name the $10 plan or the trial
- [ ] The package has no `clientId`, `clientSecret`, hooks, or `.app.json`
- [ ] The ZIP from `pnpm run pack:openai-plugin` stays uncommitted
- [ ] Portal Submit and Portal Publish stay human
- [ ] No profile tool, ChatGPT UI, or domain-challenge route was added
- [ ] UserInfo email work is not claimed done
- [ ] Policy claims stay in [bondery-legal](../bondery-legal/SKILL.md)
- [ ] A user-visible product change uses [bondery-changelog](../bondery-changelog/SKILL.md)
