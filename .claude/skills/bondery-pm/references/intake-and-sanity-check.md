# Inbox and sanity check

## Inbox

All new cards land in **Inbox** (default triage state). Agents must not skip to Building.

Inbox UUID: `94a37b5a-efab-4a97-ad54-bb175fbd5423`

## Sanity check

Before a card moves from **Inbox** → **Icebox** or **Bet**, the description must include a `## Sanity check` section with answers to all five:

1. **Who is the user?** — Persona or `operator/founder`.
2. **What pain or opportunity?** — One sentence on the problem or upside.
3. **How do we know?** — Support ticket, churn, usage, founder, ROADMAP vote, agent, analytics, …
4. **Smallest shippable slice** — This week's slice, or `not this week`.
5. **How will we know it worked?** — Metric, qualitative signal, or concrete outcome (e.g. "unblocks self-host docs", "reduces API p95 by 20%").

## Triage outcomes

| Result | Next state |
|--------|------------|
| Valid, not now | **Icebox** |
| Ready to scope | **Bet** or **Bet for Next Cycle** |
| Cannot answer honestly | Stay in **Inbox** or **Won't do** with reason comment |

## Inbox checklist

- [ ] Card is in Inbox state
- [ ] Title is `[Type] outcome-oriented title` (see [title-and-description.md](title-and-description.md))
- [ ] `## Outcome` and `## Sanity check` sections present in description
- [ ] Owner assigned before leaving Inbox
