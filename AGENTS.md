<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

## Scratch files

Put scratch files in `.temp/` (gitignored): logs, throwaway scripts, dumps. Never commit them, and never leave them at the repo root.

## Root causes, not stopgaps

Fix the root cause. Do not ship a stopgap and mention it in the report. Reproduce a failure in isolation, change one variable at a time, and verify through the real path (the supervisor or turbo, not a manual run).

`scripts/check/check-no-workarounds.mjs` enforces this: pre-commit, commit-msg and CI reject "workaround", "hack", "kludge", "band-aid", "for now" and "temporary fix" in added code and commit messages. If a stopgap is truly unavoidable, open an issue and mark the line `allow-workaround(#<issue>)`. The issue owns removing it.

## The loop: write, check, fix, report

After every change, run `pnpm run check:changed` before you report. It runs only the checks your diff can break (Biome, stopgap wording, types for affected packages, docs, i18n, OpenAPI, API errors, env) in parallel, in well under a minute when cached. Fix failures at the cause, re-run, and report only when it passes. In Claude Code a Stop hook enforces this. CI runs the full `pnpm run check`.

Prefer a Biome rule for any code-structure rule (native rules first, GritQL plugins for custom patterns). Use a script only for what Biome cannot do: comment wording, rules scoped to the diff, commit messages and cross-file consistency.

## Agent files: one source

Edit agent definitions in `.agents/agents/` and skills in `.agents/skills/`. Never edit `.claude/agents/`, `.claude/skills/` or `.cursor/agents/`: they are generated mirrors so Claude Code (including inside Orca) and Cursor see the same files. Pre-commit runs `pnpm run agents:sync` and stages the mirrors; `check:agent-files` fails on drift in `check:changed` and CI.

