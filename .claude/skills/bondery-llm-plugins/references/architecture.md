# Architecture

`llm-plugins/src` is the only edited source. The builder writes two committed packages. Do not edit the generated folders. Decision record: [ADR 0016](../../../../docs/adr/0016-llm-plugin-source.mdx).

`llm-plugins/` is not a pnpm workspace. `pnpm-workspace.yaml` lists `apps/*` and `packages/*` only.

## Shared source

The builder writes these parts into both packages:

- `plugin.config.json` fields. The field map is in [source-config.md](./source-config.md).
- Skills under `llm-plugins/src/skills`.
- `readme.md`, with the same connect block as the skills.
- A regular AGPL-3.0 `LICENSE` file. The builder copies that file. Do not rewrite it.
- `assets/icon.png`, the brand PNG. The builder copies that file into each package.

The root `package.json` supplies `version`. The config has no version key. The builder writes that version into each generated manifest.

## Host-only output

| Piece    | Claude                          | OpenAI               |
| -------- | ------------------------------- | -------------------- |
| Folder   | `llm-plugins/claude`            | `llm-plugins/openai` |
| Manifest | `.claude-plugin/plugin.json`    | root `plugin.json`   |
| MCP file | `.mcp.json`                     | root `mcp.json`      |
| MCP type | `http`                          | `streamable-http`    |
| Publish  | directory tracks `release`      | human ZIP upload     |

## MCP skills

The builder also writes `apps/api/src/routes/mcp/skills.generated.ts`. It holds each skill body, keyed by `<skill>/SKILL.md`, with the connect block replaced by `hosts.mcp.skillConnect`. The API bundles the module, so it reads no files at runtime.

`apps/api/src/routes/mcp/skills.ts` loads the module into one SDK skills catalog (SEP-2640) per process, under the prefix `bondery`. Each per-request `McpServer` attaches that catalog. Clients read `skill://bondery/<skill>/SKILL.md`.

Any MCP client can read these skills, so they follow the OpenAI rule: no word Claude. The catalog is strict, so an invalid skill fails `skills.test.ts` and API startup.

Host field rules are in [claude.md](./claude.md) and [source-config.md](./source-config.md). OpenAI limits are in [openai-package.md](./openai-package.md).

## Commands

1. Edit `llm-plugins/src`.
2. Run `pnpm run build:llm-plugins`.
3. Commit `llm-plugins/claude`, `llm-plugins/openai`, and `apps/api/src/routes/mcp/skills.generated.ts` with the source.
4. Run `pnpm run check:llm-plugins`. The check fails on drift.

`pnpm run check:claude-plugin` runs the same check.

`pnpm run pack:openai-plugin` writes a gitignored ZIP for a human upload. Do not commit that ZIP. Each production release attaches the same ZIP to its GitHub release as `bondery-openai-plugin-X.Y.Z.zip`. Portal steps are in [openai-submission.md](./openai-submission.md).

Token and secret rules stay in [bondery-security](../../bondery-security/SKILL.md).

## Checklist

- [ ] The edit is under `llm-plugins/src`
- [ ] `pnpm run build:llm-plugins` has run
- [ ] Both generated folders are committed with the source
- [ ] The builder is the only writer of the generated folders
- [ ] `pnpm run check:llm-plugins` passes
- [ ] The ZIP is not committed
