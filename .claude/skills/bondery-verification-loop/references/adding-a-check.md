# Adding a check

A convention that lives only in a skill file is a request. A check is a guarantee. When an agent
ships a defect that a rule could have caught, add the rule instead of adding another warning.

## Pick the layer

Choose the cheapest layer that can decide the rule. A later layer costs more per run and runs
less often, so it catches the defect later.

| Layer                 | Use when                                                          | Mechanism                                                           |
| --------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| 1. Biome rule         | One file decides it, and the rule is about the AST                | Native rule in `biome.json`, or a GritQL plugin in `biome/plugins/` |
| 2. Diff-scoped script | The rule spans files, or it reads text Biome cannot parse         | `scripts/check/check-*.mjs`, wired into `check:changed`             |
| 3. Pre-commit         | The rule is about staged content or the commit message            | `lefthook.yml`                                                      |
| 4. CI                 | The rule needs a database, Docker, a browser, or the built output | `.github/workflows/verify.yml`                                      |

Prefer Biome. A native rule is faster, auto-fixable, and shows in the editor. Write a GritQL
plugin only for a pattern Biome has no rule for. Write a script only for what Biome cannot do:
comment wording, cross-file consistency, the diff scope, commit messages, or a generated-file
guard.

## Write the rule

1. **Name the defect, not the style.** Write the reason at the top of the file: which bug this
   stops, and why the obvious alternative is wrong.
2. **Name the remedy in every message.** The message must say what to do. See the diagnostic
   wording rules in [`bondery-coding-standards`](../../bondery-coding-standards/references/code-craft.md).
   `check:diagnostic-messages` enforces this.
3. **Allow a tracked exception.** A hard rule with no escape hatch gets bypassed, and a bypassed
   rule protects nothing. Follow `check-no-workarounds`: the suppression must cite an issue.
4. **Keep the rule narrow.** A rule that fires on correct code trains the reader to ignore it.

## Test the rule

A rule without a test is a comment that runs. The test must prove two things:

- **It fires** on the code that caused the bug.
- **It stays silent** on the near-miss code that is correct.

Use the real source as a case, and prove the rule is what satisfies it. Strip the fix from the
real file and assert the rule then fires, as `check-input-safety.test.mjs` does:

```js
const stripped = text.replaceAll("sanitizeNotesHtml", "identity");
assert.equal(findUnsanitizedNotesWriters([file(stripped, path)]).length, 1, path);
```

For a Biome plugin, write the case files into a temporary project with its own `biome.json` and
assert the exact diagnostic count per file. See `no-unsafe-secret-compare.test.mjs`. Test files
live in `scripts/check/*.test.mjs` and run through `pnpm run test:check-scripts`.

## Wire the rule

A check that runs nowhere protects nothing. Add it in all four places that apply:

1. **`package.json`** — a `check:<name>` script.
2. **`scripts/check/check-changed.mjs`** — an entry in `CHECKS`, with a `when` that matches the
   paths the rule can break. Mark `mutatesDist: true` when the check rebuilds package output.
3. **`.github/workflows/verify.yml`** — a CI step, so a local skip cannot merge.
4. **The owning skill** — one line saying the rule exists and which command enforces it.

Then add a case to `check-changed.test.mjs` that asserts the plan includes the check for the
paths it guards.

## Report a failure

Return the failure to the agent that caused it, in a form it can act on:

- Name the file and line.
- Show the smallest preview of the offending text.
- State the fix, not the rule.
- Give the command to confirm the fix.

`check:changed` already trims each failure to its last 40 lines, and the Claude Code Stop hook
returns the whole summary, so the agent can fix and re-run in one turn.
