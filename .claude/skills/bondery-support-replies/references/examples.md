# Examples

Use these as a bar, not as templates to paste. Greetings use `{Name}` / `@login` only. Never put real user names, emails, or GitHub handles in this skill.

They already wrote the problem. Do not copy it back. Answer.

## 1. Bug they already described (no recap)

**Incoming:** Participant filter when adding an interaction does not work. Steps and screenshots in the issue.

**Draft:**

```
Hi @login,

Thanks for pointing this out and taking your time to open an issue.

This has been fixed in 1.10.2, which is already deployed on the hosted app. Refresh and try the same search again.

If anything else is annoying or still off, say so. Any other feedback, especially the frustrating kind, is welcome. It helps us make Bondery more delightful and useful for you.

Sveetya
```

## 2. GitHub bug with data loss (Premium yes)

**Incoming:** Import wiped notes on three people.

**Draft:**

```
Hi {Name},

Thanks for reporting this, and sorry we lost your notes. That's on us.

I'll look at the import path and reply here when I know whether we can recover them and what fix is going in.

This was on us, so I'd like to give you 6 months of Premium. Email [team@usebondery.com](mailto:team@usebondery.com) from the address on your Bondery account so we can credit it.

Any other feedback, especially the frustrating kind, is welcome. It helps us make Bondery more delightful and useful for you.

Sveetya
```

Operator note: `Premium offer included. Credit after they write in.`

## 3. Feature request (Premium no)

**Incoming:** Wants Salesforce-style pipelines.

**Draft:**

```
Hi @login,

We're not going to add sales pipelines. Bondery is a personal relationship manager, not a sales tool, and that view would pull us the wrong way. If the underlying need is "who should I follow up with, and why", say more about that. That's closer to what we do build.

Any other feedback, especially the critical kind, is welcome. It helps us make Bondery more delightful and useful for you.

Sveetya
```

## 4. Angry email about a missed reminder (Premium only if the pain is real)

**Incoming:** Reminder digest didn't send. They missed a friend's birthday.

If this was a one-off miss they recovered from, skip Premium. If they missed something they cannot undo, or this happened repeatedly, include the Premium paragraph from [premium-offer.md](./premium-offer.md).

**Draft (pain is real, Premium yes):**

```
Hi {Name},

I'm sorry. That's exactly the failure Bondery is supposed to prevent.

I'll check why that send didn't happen and write back with what we find. If you still want to send a note, the person page in the app has the last context we stored.

This was on us, so I'd like to give you 6 months of Premium. Email [team@usebondery.com](mailto:team@usebondery.com) from the address on your Bondery account so we can credit it.

Any other feedback, especially the frustrating kind, is welcome. It helps us make Bondery more delightful and useful for you.

Sveetya
```

## 5. Slop vs rewrite

**Incoming:** Login loop on Safari.

**Do not ship:**

```
Hi {Name},

Thank you so much for reaching out — I completely understand how frustrating this must be! We truly value your feedback.

It looks like you may be experiencing a login issue. Please don't hesitate to try clearing your cache. I hope this helps!

Best regards,
The Bondery Team
```

**Also do not ship (recap):**

```
Hi {Name},

Safari keeps bouncing you back to login instead of opening the app.

That's a real bug on our side...
```

**Rewrite:**

```
Hi {Name},

Thanks for reporting this. That's a real bug on our side, not something you did.

I'll reproduce it in Safari and reply with a fix or a workaround that actually works. If you have the exact URL you land on after the bounce, send that too.

Any other feedback, especially the frustrating kind, is welcome. It helps us make Bondery more delightful and useful for you.

Sveetya
```

## Examples checklist

- [ ] No recap of the problem they already wrote
- [ ] No real user names, emails, or GitHub handles
- [ ] Bug with real harm includes Premium + mailto
- [ ] Feature we will not build says no and why
- [ ] Slop version would fail [voice.md](./voice.md)
