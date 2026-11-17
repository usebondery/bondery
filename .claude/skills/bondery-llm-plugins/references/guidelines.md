# Skill text and tool hints

Edit skills under `llm-plugins/src/skills`. The builder copies rendered skills into each package. Do not edit the generated skill files.

## Connect block

Put host-specific connect lines inside this block. `readme.md` uses the same block. Do not put shared lines inside the block.

```html
<!-- llm-plugin-connect -->
<!-- /llm-plugin-connect -->
```

Text outside the block must not contain the word Claude. The OpenAI ZIP rejects that word in skill bodies.

The Claude replacement may name Claude. The Claude replacement may include `Use Claude's published identity`.

The OpenAI replacement must not contain the word Claude.

## Listing and policy

Do not name the $10 plan. Do not name the trial. Do not put a checkout link in a skill.

Do not paste Privacy text. Do not paste Terms text. Policy wording stays in [bondery-legal](../../bondery-legal/SKILL.md).

Do not add a profile tool. Do not add a ChatGPT UI.

## Tool hints

The API already sets tool hints in `apps/api/src/routes/mcp/tools/mcp-tool-meta.ts`. Do not restate a hint that disagrees with this table. Every kind sets `openWorldHint` to false.

| Kind | `readOnlyHint` | `destructiveHint` | `openWorldHint` | `idempotentHint` |
|------|----------------|-------------------|-----------------|------------------|
| `create` | false | true | false | false |
| `delete` | false | true | false | false |
| `get` | true | false | false | true |
| `search` | true | false | false | true |
| `update` | false | true | false | true |

`create` and `delete` set `idempotentHint` to false. `get`, `search`, and `update` set `idempotentHint` to true.

## Tips

- Keep one job in each skill file.
- Keep the word Claude inside the connect block.
- Name only tools the API registers. Do not invent a profile tool.
- Do not claim that a tool reaches the open web. `openWorldHint` is false for every kind.
- When tools are missing, the connect block tells the host how to authenticate.

Local Inspector steps stay in [docs/contributing/mcp.mdx](../../../../docs/contributing/mcp.mdx).

## Checklist

- [ ] Host-specific connect lines sit inside the connect block
- [ ] Text outside the block does not contain the word Claude
- [ ] The OpenAI replacement does not contain the word Claude
- [ ] The Claude replacement may name Claude and `Use Claude's published identity`
- [ ] Skills do not name the $10 plan, the trial, or a checkout link
- [ ] Skills do not paste Privacy text or Terms text
- [ ] Skill claims match `mcp-tool-meta.ts`
- [ ] No profile tool was added
