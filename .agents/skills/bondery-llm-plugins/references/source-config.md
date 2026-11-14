# Source config

The config file is `llm-plugins/src/plugin.config.json`. The file has no version key. The root `package.json` supplies `version`.

## Shared fields

| Key | Rule |
|-----|------|
| `name` | Package name. Use lowercase letters, numbers, and single hyphens. Stay at or under 64 characters. |
| `displayName` | `Bondery`. OpenAI allows at most 30 characters. |
| `description` | Shared long text. Stay at or under 4000 characters. |
| `author` | Shared author object. Both manifests use `author.name`, `author.email` (`team@usebondery.com`), and `author.url`. |
| `license` | `AGPL-3.0`. |
| `keywords` | Shared list. |
| `repository` | Shared repository URL. |
| `links.homepage` | Shared URL. |
| `links.documentation` | Shared URL. |
| `links.support` | Shared URL. |
| `links.privacy` | Shared URL. Do not paste policy text. |
| `links.terms` | Shared URL. Do not paste policy text. |
| `mcp.url` | `https://api.usebondery.com/mcp` |
| `mcp.serverName` | `bondery` |

Policy wording stays in [bondery-legal](../../bondery-legal/SKILL.md).

## Files next to the config

Skills live in `llm-plugins/src/skills`.

The builder replaces this block per host. `readme.md` uses the same block. Skill rules are in [guidelines.md](./guidelines.md).

```html
<!-- llm-plugin-connect -->
<!-- /llm-plugin-connect -->
```

The `LICENSE` file is a regular AGPL-3.0 file. The builder copies it into each package. Do not rewrite it.

`assets/icon.png` is the brand PNG. The builder copies it into each package.

## Claude overlay

The builder writes `.claude-plugin/plugin.json` and `.mcp.json`.

`.mcp.json` uses `type` `http`:

```json
{
  "mcpServers": {
    "bondery": {
      "type": "http",
      "url": "https://api.usebondery.com/mcp"
    }
  }
}
```

Set these listing keys on the Claude manifest:

| Key | Source |
|-----|--------|
| `icon` | `./assets/icon.png` |
| `documentationUrl` | `links.documentation` |
| `supportUrl` | `links.support` |
| `privacyPolicyUrl` | `links.privacy` |
| `termsOfServiceUrl` | `links.terms` |

Do not add a component key. Branch rules are in [claude.md](./claude.md).

## OpenAI overlay

The builder writes root `plugin.json` and root `mcp.json`.

`plugin.json` sets `$schema` to `https://agent-plugins.org/schemas/1.0.0/plugin.schema.json`.

`mcp.json` sets `$schema` to `https://agent-plugins.org/schemas/1.0.0/mcp.schema.json`. The server `type` is `streamable-http`. The server name is `bondery`. The URL is `https://api.usebondery.com/mcp`.

Put the listing under `extensions["com.openai"].interface`:

| Key | Value |
|-----|-------|
| `displayName` | `Bondery` |
| `shortDescription` | `People you mean to remember` (27 characters) |
| `category` | `Productivity` |
| `logo` | `./assets/icon.png` |
| `logoDark` | `./assets/icon.png` |
| `composerIcon` | `./assets/icon.png` |
| `composerIconDark` | `./assets/icon.png` |
| `brandColor` | `BRAND_PRIMARY_COLOR` from `packages/branding/src/colors.ts` |
| `brandColorDark` | The same `BRAND_PRIMARY_COLOR` |
| `onboardingSkill` | `./skills/onboarding/SKILL.md` |

`shortDescription` is not the shared `description`. The 30 character cap is in [openai-package.md](./openai-package.md).

Auth sits on the MCP server entry in `mcp.json`, at `extensions["com.openai"].auth`. Do not put auth on `plugin.json`.

```json
{ "type": "oauth", "client": { "mode": "cimd" } }
```

Do not add `clientId`. Do not add `clientSecret`.

The published MCP schema does not list `extensions` on a streamable HTTP server. That object sets `additionalProperties` to false. OpenAI still requires this auth key on the server entry. Keep the key. The [OpenAI package guide](https://developers.openai.com/plugins/build/plugins) documents the key.

Set `review.commerce` to false.

Store five positive cases in the config. Store three negative cases in the config.

When `demo_recording_url` is empty, the builder omits it.

`publication.countries` is written even when the array is empty. `[]` means no country limit. Do not omit the key.

Do not write `.codex-plugin`. Do not write `.app.json`. Do not write hooks. Do not write `userConfig`.

Package limits and ZIP bans are in [openai-package.md](./openai-package.md).

## Checklist

- [ ] Config path is `llm-plugins/src/plugin.config.json`
- [ ] The config has no version key
- [ ] Shared fields, `mcp.url`, and `mcp.serverName` match this map
- [ ] Skills and `readme.md` contain the connect block
- [ ] `LICENSE` is a copied AGPL-3.0 file
- [ ] `assets/icon.png` is the brand PNG
- [ ] Claude listing keys are set, with no component key
- [ ] Claude `.mcp.json` uses `type` `http`
- [ ] OpenAI schemas, `streamable-http`, and the interface fields are set
- [ ] Auth is the CIMD object on the MCP server entry
- [ ] `review.commerce` is false
- [ ] The config holds five positive cases and three negative cases
- [ ] Empty `demo_recording_url` is omitted
- [ ] `publication.countries` is present. `[]` means no country limit
- [ ] `author.email` is `team@usebondery.com`
- [ ] `brandColor` and `brandColorDark` match `BRAND_PRIMARY_COLOR`
- [ ] `logoDark` and `composerIconDark` point at `./assets/icon.png`
- [ ] `onboardingSkill` points at `./skills/onboarding/SKILL.md`
- [ ] The package has no `.codex-plugin`, `.app.json`, hooks, or `userConfig`
