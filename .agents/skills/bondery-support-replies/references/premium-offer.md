# Premium offer

Offer **6 months of Premium on us** only when the bar is met. Most replies should not include it.

## Offer when (rare)

- They reported a real bug that blocked them or lost data
- They wrote unusually useful product feedback we will actually use
- We caused a billing or account mess

## Do not offer

- How-to questions
- Mild nits
- Generic feature requests
- People fishing for credit
- Abuse (stay civil, no gift)

If unsure, do not offer. Ask the operator.

## Wording

Six months of Premium on us. Ask them to email [team@usebondery.com](mailto:team@usebondery.com) so we know which account to credit.

- Channels that support links: use `[team@usebondery.com](mailto:team@usebondery.com)`.
- Plain text: write `team@usebondery.com`.

Never invent a promo code. Never promise Stripe will auto-apply. Never include a fake coupon.

Address source of truth: `SUPPORT_EMAIL` in `packages/helpers` (`team@usebondery.com`). Also listed in [legal-entity.md](../../bondery-legal/references/legal-entity.md).

## Example paragraph

```
This was on us, so I'd like to give you 6 months of Premium. Email [team@usebondery.com](mailto:team@usebondery.com) from the address on your Bondery account so we can credit it.
```

## After the draft

One operator-only line in chat:

`Premium offer included. Credit after they write in.`

Do not apply billing yourself. Do not open Stripe unless the operator asks.

## Premium checklist

- [ ] Bar is met (block/data loss, unusually useful feedback, or we caused a billing mess)
- [ ] Mailto / address is `team@usebondery.com`
- [ ] No invented promo code
- [ ] Operator note added after the draft
