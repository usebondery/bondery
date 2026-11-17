# Progressive disclosure

Show the minimum that unblocks the user. Add complexity when they choose to.

---

## Decision rules

| Question | Answer | Pattern |
|----------|--------|---------|
| Can you derive it from existing data? | Yes | Do silently — no extra field |
| Optional and rarely set at creation? | Yes | Edit flow, not create flow |
| Required before proceed? | Yes | Ask at that moment, no earlier |

---

## Bondery examples

- **Contact creation** — one "Full name" field; derive name parts; phones/birthday in detail edit.
- **Social link add** — pick platform first, then reveal handle input.

---

## What to avoid

- "Just in case" forms with many optional fields at creation.
- Multi-step wizards when one well-labelled field suffices.
- Advanced options beside basic ones — use "More options" or settings.
