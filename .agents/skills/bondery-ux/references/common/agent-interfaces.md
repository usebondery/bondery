# Agent interfaces (MCP tools and in-app chat tools)

A tool that an AI agent calls is a UX surface. The user is the agent. The interface is the tool name, the description, the error, and the recovery path.

This file applies to `POST /mcp` tools, MCP prompts, and the in-app chat tools that share the same names. For tool naming, scopes, and protocol confirm, see the `bondery-api` skill → [mcp-tools.md](../../../bondery-api/references/mcp-tools.md). For client-side error display, see [api-errors-display.md](./api-errors-display.md).

---

## Principle: an agent iterates on its own

An agent must repair a failed call without a human. The error is the only teacher. A tool that says "Failed" forces the agent to guess. A tool that says what broke, why, and what to change lets the agent fix the call and retry.

Two product guarantees carry this principle:

1. **Every failure returns a structured, descriptive error.** The error states WHAT failed, WHY it failed, and HOW to fix the call. Every error links to our docs.
2. **Every agent has a way to report a defect.** The agent reports a bug or a friction point for us to review. The agent does not need a human to file it.

---

## Error contract

A tool failure returns the REST nested envelope with `isError: true`:

```json
{
  "error": {
    "type": "not_found_error",
    "code": "contact_not_found",
    "message": "Contact not found",
    "agent_message": "Contact not found. Call search_contacts with the person's name and retry with a personId from the results.",
    "request_id": "req_abc123",
    "param": "personId",
    "details": { "personId": "018f..." },
    "doc_url": "https://usebondery.com/docs/api/errors/contact_not_found"
  }
}
```

| Field | Answers | Rule |
|-------|---------|------|
| `code` | WHAT class of failure | Catalog code, snake_case, stable. Never a new literal. |
| `param` | WHAT input is wrong | Present when one argument caused the failure. |
| `details` | WHY, with data | Machine-actionable facts. Allowed values, conflicts, bounds, ids. |
| `message` | WHY, for a developer | One sentence. Name the cause, not the symptom. No recovery step. |
| `agent_message` | HOW, for an agent | **Always present.** The `message` plus one imperative recovery step. |
| `doc_url` | HOW, in full | Always present. `/docs/api/errors/{code}`. |
| `request_id` | Support trail | Echo the request id. The agent quotes it in a feedback report. |

`agent_message` is a required field on `apiErrorBodySchema`, so no builder can omit it. It is produced by `buildAgentMessage(code, message)` in `@bondery/schemas/errors`, which uses a per-code hint table and falls back to the docs link. `doc_url` comes from `getErrorDocUrl(code, websiteBaseUrl())`. Do not build either by hand.

On agent tool surfaces, `toAgentToolErrorResponse` also sets `message` equal to `agent_message`, because a model reads `message` first and may never look at the second field. REST keeps the terse `message`.

---

## Message rules: WHAT, WHY, HOW

`message` carries WHAT failed and WHY. `agent_message` adds HOW. Write the two as separate sentences, never as one run-on string.

| Part | Question the agent asks | Example fragment |
|------|-------------------------|------------------|
| WHAT | Which call or resource failed? | `Cannot create interaction` |
| WHY | What rule or cause blocked it? | `participant 018f… is not a contact you own` |
| HOW | What exact change fixes the call? | `Use search_contacts to find a personId you own, then retry` |

| Bad | Good (`agent_message`) |
|-----|------|
| `Contact not found` | `personId 018f… does not belong to a contact you own. Call search_contacts with the person's name, then retry with a returned personId.` |
| `Forbidden` | `delete_contact needs mcp:write. Ask the user to reconnect with Full access, or use a read tool.` |
| `Invalid body` | `phones[0].value must be E.164, for example +420601123456. Fix the value and retry.` |
| `Something went wrong` | `The confirmation expired after 5 minutes. Call delete_contact again to get a new prompt.` |

Rules:

- `message` names the cause. `agent_message` = `message` + one recovery sentence.
- A code with no hint entry still gets `agent_message`: the fallback points at `doc_url`.
- Name the argument in backticks when the fix is an argument change.
- Never repeat the HTTP status as the message. The status is not a cause.
- Never send internal detail, stack traces, SQL, or another user's data in either field.
- Give the agent one next step. Do not list every option.
- Keep 5xx causes generic. Log the detail server-side with `request_id`.

Validation failures on the Fastify route keep `code: "validation_error"` and put field issues in `details`. The same rule applies over MCP.

## `details` carries the fix

Put the facts that let the agent repair the call without a second lookup.

| Failure | Put in `details` |
|---------|------------------|
| Unknown id | The rejected id, and the resource type |
| Duplicate | The conflicting record id and label |
| Out of range | The bound and the received value |
| Wrong enum | The allowed values |
| Scope missing | The required scope, for example `mcp:write` |
| Expired confirm | The TTL in seconds |

Never put a secret, token, or another tenant's row in `details`.

## The doc page is part of the error

`doc_url` is not decoration. The agent fetches it to learn the recovery. Every catalog code has a page at `docs/api/errors/{code}.mdx`.

A page must answer three questions in this order:

1. **When this happens** — the cause, in agent terms.
2. **What your integration should do** — the fix, as an imperative instruction the agent can follow.
3. **What end users should see** — the client copy rule.

The page must not only restate the message. It adds the recovery the message could not hold.

Add a page when you add a code. `pnpm run check:api-errors` gates the catalog, the translations, and the pages.

---

## Feedback channel

An agent finds a defect that no error explains. A wrong description, a missing tool, a confusing argument, or a wrong result. The agent must report it in the session, without a human.

Requirements for the channel:

| Requirement | Rule |
|-------------|------|
| Discoverable | A tool in `tools/list`, or an instruction in `MCP_SERVER_INSTRUCTIONS`. The agent learns about it without a human. |
| Named by the tool rules | `{create\|get\|update\|delete\|search}_{resource}`. A write is `create_agent_feedback`. |
| Structured | Separate fields for kind, tool, summary, expected, actual, and `request_id`. No single free-text blob. |
| Redacted | The agent must not send contact data, tokens, or emails. Ask for a description, not for a payload. |
| Scoped | Writes need `mcp:write`. Reads stay open. |
| Rate limited | One tool, one tier. Do not let a loop flood the inbox. |
| Reviewable | It lands where we read it. An email, a ticket, or a table we triage. |
| Answered | The tool returns an id the agent can quote. The reply must not promise a fix deadline. |

Minimum input shape:

```json
{
  "kind": "bug | friction | feature",
  "toolName": "create_interaction",
  "summary": "date rejected for a valid ISO day",
  "expected": "accept 2026-11-03",
  "actual": "validation_error with message 'Invalid date'",
  "requestId": "req_abc123"
}
```

The agent already receives `request_id` in every error. Tell it to attach that id. Support can then find the log line.

Do not reuse the NPS feedback form for this channel. The NPS form takes a score and user opinion. An agent report takes a defect and a request id.

---

## Checklist

- [ ] Failure returns the nested envelope with `isError: true`, not a plain string
- [ ] `code` is a catalog code, and a docs page exists at `/docs/api/errors/{code}`
- [ ] `agent_message` is present on every error body — the schema requires it
- [ ] `doc_url` comes from `getErrorDocUrl`, not a hand-built string
- [ ] `message` states WHAT failed and WHY; `agent_message` adds HOW as a separate sentence
- [ ] A new reachable code has a hint in `agent-messages.ts`, or the docs-link fallback is acceptable
- [ ] `param` names the offending argument when one argument caused the failure
- [ ] `details` carries the values that let the agent repair the call
- [ ] No secret, token, stack trace, or foreign tenant data in `message`, `agent_message`, or `details`
- [ ] The docs page has an imperative "What your integration should do" section
- [ ] The agent has a discoverable, structured, rate-limited way to report a bug
- [ ] A reported bug returns an id, and the error `request_id` is part of the report
