---
icon: user-vneck-hair
docId: concepts.people
---

# People

People are the foundation of Bondery. Each person represents a node in your network — a friend, colleague, family member, or anyone you want to stay connected with.

### What a contact holds

| Field            | Description                                                                         |
| ---------------- | ----------------------------------------------------------------------------------- |
| Name             | First, middle, and last name, plus optional nickname and title                      |
| Phones           | One or more phone numbers, each with a type (`home` or `work`) and a preferred flag |
| Emails           | Same structure as phones                                                            |
| Socials          | LinkedIn, Instagram, Facebook, WhatsApp, Signal, and website                        |
| Location         | Free-text location field, or a precise latitude/longitude position                  |
| Avatar           | Profile photo                                                                       |
| Notes            | Free-form text for anything you want to remember                                    |
| Last interaction | Automatically updated when you log an event with this contact                       |

### Myself

One contact per account is marked as [Myself](myself.md) — your own profile, used when sharing yourself and on the "yourself" side of relationships.

### Importing contacts

There are three ways to add contacts from LinkedIn or Instagram:

| Method | Best for | Where |
|---|---|---|
| **[Chrome Extension](../bondery/chrome-extension.md)** | Saving profiles while you browse | One click on a LinkedIn or Instagram profile page |
| **[Bulk import](../bondery/import.md)** | Your full connection list from a platform export | Webapp → **Settings → Data management** |
| **Manual entry** | Anyone, any source | **Add contact** in the webapp or mobile app |

The extension captures name, headline, location, photo, and social handles from the page you are viewing. Bulk import reads LinkedIn `Connections.csv` or Instagram export ZIPs and lets you preview before committing.

Mobile does not run the extension or bulk ZIP import — use the webapp for those flows, then changes sync to mobile automatically.

### Related concepts

* [Myself](myself.md) — your own profile contact
* [Groups](groups.md) — organize contacts into labeled categories
* [Relationships](relationships.md) — define how two contacts relate to each other
* [Interactions](interactions.md) — log interactions you have with a contact
* [Reminders](reminders.md) — get notified about important dates
* [Import contacts](../bondery/import.md) — bulk import from LinkedIn or Instagram exports
* [Chrome Extension](../bondery/chrome-extension.md) — save profiles while browsing
