# Empty states

Every empty surface must answer two questions:

1. **What happened?** — zero contacts, no search matches, all caught up, nothing to fix.
2. **What can I do?** — one obvious next step.

Opportunity framing, not apology. See [ux-writing.md](./ux-writing.md).

---

## Tiers

| Tier | When | Pattern |
|------|------|---------|
| **Actionable** | Primary surfaces (People, Groups, Keep-in-touch, Chat, onboarding) | Icon or illustration + headline + **primary CTA** |
| **Informational** | Modals, filters, secondary panels | Short dim text; CTA only if there is a clear action |
| **Search no-match** | User typed a query | "No results for …" + suggest clearing search or different terms |

**Rule:** If the user landed here expecting work (main nav destination), use **actionable**. If they narrowed a list themselves, **informational** is enough.

---

## Bondery examples

| Surface | Good pattern |
|---------|----------------|
| **People — no contacts** | CTA to add person or import |
| **People — no search matches** | Name the query; clear search affordance |
| **Keep-in-touch — all caught up** | Positive framing + optional link to People |
| **Chat — new session** | Suggested prompts to start |
| **Groups — empty** | CTA to create group (avoid dim text only) |
| **Import preview — no selectable rows** | Explain why (duplicates) + back/close |

---

## Implementation

- **Web tables:** `DataTable` `emptyStateMessage` — pass translated copy; add CTA in parent when tier is actionable.
- **Mobile lists:** `ContactsScreenList` — distinguish empty book vs empty search.
- Reuse production components in previews (e.g. chip rows), not one-off mockups.

---

## What to avoid

- Empty primary page with no CTA ("No data").
- Apologetic copy ("Sorry, nothing here").
- Success toast when navigating to an empty state the user caused (e.g. deleted last item — the empty view is the feedback).
- Different empty copy per platform for the same concept — keep mental model aligned; layout may differ.
