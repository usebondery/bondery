# Evaluating skill output quality

Source: https://agentskills.io/skill-creation/evaluating-skills

## When to evaluate

- After creating a new skill
- After a major restructure
- When agents false-positive activate a skill or miss it entirely

## Process

1. **Write 3–5 test prompts** — realistic tasks that should trigger the skill
2. **Run with and without** the skill active (if possible)
3. **Read execution traces**, not just final output — did the agent load the right reference? Skip steps? invent paths?
4. **Revise** description (activation) or body (execution) based on gaps
5. **Repeat** until prompts consistently succeed

## What to look for

| Symptom | Fix |
|---------|-----|
| Skill never activates | Improve `description` trigger keywords |
| Skill activates too often | Narrow `description`; move edge cases to references |
| Agent ignores checklist | Move critical items to Non-negotiables |
| Agent invents paths | Add gotchas with real file paths |
| SKILL.md too long | Split to `references/` with decision tree |

## False positive tests

Also run prompts that should **not** activate the skill. If they do, tighten the description.

## Checklist

- [ ] At least 3 test prompts documented (in PR or skill PR description)
- [ ] Description updated if activation was wrong
- [ ] Gotchas added for each correction made during evaluation
