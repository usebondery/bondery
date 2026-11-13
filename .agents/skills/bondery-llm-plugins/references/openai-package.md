# OpenAI package limits

These limits apply to the portable package in `llm-plugins/openai`. Field placement is in [source-config.md](./source-config.md). Portal steps are in [openai-submission.md](./openai-submission.md).

## Text limits

| Field | Limit |
|-------|-------|
| `displayName` | At most 30 characters. The value is `Bondery`. |
| `shortDescription` | At most 30 characters. The value is `People you mean to remember` (27 characters). |
| `longDescription` | At most 4000 characters. |
| `name` | At most 64 characters. Use lowercase letters, numbers, and single hyphens. |

Do not repeat a hyphen in `name`. Do not put the long text in `shortDescription`.

## Server

The package lists one remote MCP server. The name is `bondery`. The URL is `https://api.usebondery.com/mcp`. The `type` is `streamable-http`.

Auth is this object on that server entry:

```json
{ "type": "oauth", "client": { "mode": "cimd" } }
```

Do not add `clientId`. Do not add `clientSecret`. Do not put auth on `plugin.json`.

## ZIP bans

The ZIP must not contain:

- hooks
- `.app.json`
- secrets
- `clientSecret`
- the word Claude in skill bodies

Do not write `.codex-plugin`. Do not write `userConfig`.

## Icons

Each icon is square. Each side is at least 48 px. The same PNG may be `logo` and `composerIcon`. Both paths are `./assets/icon.png`.

## Checklist

- [ ] `displayName` and `shortDescription` are at or under 30 characters
- [ ] `longDescription` is at or under 4000 characters
- [ ] `name` is at or under 64 characters, with lowercase letters, numbers, and single hyphens
- [ ] The package lists one remote MCP server
- [ ] Auth is CIMD on the server entry, with no `clientId` and no `clientSecret`
- [ ] The ZIP has no hooks, `.app.json`, secrets, `clientSecret`, or the word Claude in skill bodies
- [ ] Icons are square and at least 48 px on each side
