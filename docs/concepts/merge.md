# Merge contacts

Over time it is easy to end up with duplicate contacts — one created manually and one imported from LinkedIn or Instagram, for example. The merge feature lets you consolidate them into a single record without losing any data.

## Merge recommendations

Bondery automatically detects likely duplicates and surfaces them as **merge recommendations**. The algorithm compares every pair of your contacts using three signals:

| Signal | How it works |
|---|---|
| Full name | Dice-coefficient similarity ≥ 84 % after normalizing diacritics and punctuation |
| Email | At least one shared email address (normalized) |
| Phone | At least one shared phone number (normalized, prefix-aware) |

A pair is only recommended if at least one signal matches. Pairs that have different LinkedIn or Facebook handles are excluded automatically — different handles are a strong sign the two records are not the same person.

Recommendations are shown on the **Contacts** page and can also be refreshed manually at any time.

### Declining a recommendation

If a recommendation is wrong, click **Decline**. The pair is hidden and will not appear again unless you restore it. Declined recommendations are stored so a background refresh cannot bring them back.

### Restoring a declined recommendation

Go to **Settings → Merge recommendations** to see all declined pairs and restore any of them.

## Merging contacts

You can start a merge from three places:

- The recommendations list on the Contacts page
- The **Map view** — select contacts in the viewport table and choose Merge
- A contact's page — use the Actions menu

### The merge wizard

The wizard has three steps:

1. **Pick** — choose which contact is the primary (left) and which is the secondary (right). All data from the secondary will be folded into the primary and the secondary will be deleted.

2. **Resolve conflicts** — for any field where the two contacts have different values you must pick which one to keep. Conflicting fields include:

   - Scalar fields: first name, last name, middle name, headline, location, birthday, notes, about
   - Set fields: phones, emails, important events (all entries from both contacts are merged, duplicates removed)
   - Socials: LinkedIn, Instagram, WhatsApp, Facebook, website, Signal

   If there are no conflicts, this step is skipped.

3. **Process** — Bondery executes the merge. The primary contact is updated with the resolved field values and all interactions, group memberships, and tags from the secondary contact are transferred to the primary. The secondary contact is deleted.
