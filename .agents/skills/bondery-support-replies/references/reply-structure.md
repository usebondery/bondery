# Reply structure

Every draft uses this skeleton. Compress on short public reviews; do not drop name, answer, feedback invite, or sign-off.

```
Hi {Name},

{straight answer / what we will do}

{optional Premium offer}

{feedback invite}

Sveetya
```

Default sign-off is **Sveetya**. Use another name only when the operator says so.

## Greeting

- Use the person's given name when you have it.
- GitHub: display name if present, otherwise `@login`.
- Email: the name in the From header or signature.
- Unknown name: do **not** write "Hi there". Use the handle, or ask the operator once.

## Body

1. **Do not recap.** They already described the problem. Copying it back ("when you add an interaction, the filter didn't…") helps no one. Understand it privately, then answer.
2. **Answer.** What is true, what we will do, what we will not do. Look up product/code if needed (see below). Specificity in the *fix* proves you read them.
3. **Next step.** A fix, a workaround you verified, a timeline you actually know, or "I'll dig in and reply when I know more".
4. **Premium** only when [premium-offer.md](./premium-offer.md) says so.
5. **Feedback invite.** Every reply. Negative is welcome. Example: "Any other feedback, especially the frustrating kind, is welcome. It helps us make Bondery more delightful and useful for you."

Do not apologize five times. One honest "sorry this happened" is enough when we caused it.

## Accuracy workflow (before drafting)

1. Read the full thread, not just the latest message.
2. If it is a bug or "how does this work", check the product, docs, or code. Do not guess.
3. If you cannot verify, say what you know and what you still need. Ask one clarifying question.
4. Do not invent ship dates. Do not claim legal compliance. See [bondery-legal](../../bondery-legal/SKILL.md).

## Channel notes

| Channel | Shape |
|---------|--------|
| **GitHub** | Markdown ok. Link issues/PRs. Public-safe: no other users' PII, no secrets, no Plane IDs. |
| **Email** | Same skeleton. Use a real `mailto:team@usebondery.com` link when the channel supports links. |
| **Short public reviews** | Compress. Keep name + core answer + sign-off if the platform allows. |
| **Social DMs** | Same as email, shorter. Still name + sign-off. |

Support address: `team@usebondery.com` (`SUPPORT_EMAIL` in `packages/helpers`). Do not invent another inbox.

## Operator output

Paste **only the reply** as the user-facing draft. If you offered Premium, add one line after the draft, for the operator only:

`Premium offer included. Credit after they write in.`

Never post or send. The operator copies it.

## Structure checklist

- [ ] Hi {Name}, … Sveetya
- [ ] No recap of their already-described problem; answer then next step
- [ ] Feedback invite present
- [ ] Channel-appropriate (markdown vs short; public-safe)
- [ ] Draft in chat; not posted
