---
icon: chart-network
---

# Relationships

Relationships let you describe how two persons in your network are connected to each other. They complement the contact list by making the structure of your network visible.

## How relationships work

A relationship links two people with a free-text `relationship_type` (e.g. "colleague", "friend", "mentor"). Relationships are:

* **Owned by you** — only you can see and manage the relationships in your account
* **Directional in storage, but treated as pairs** — the database prevents duplicate reverse entries for the same type, so a relationship between A and B is not duplicated as B → A
* **Not self-referencing** — a contact cannot have a relationship with itself

## Use cases

* Mark two persons as colleagues so you remember the context when reaching out
* Track family ties between persons you manage on behalf of someone else
* Visualize clusters within your network (e.g. all people from a specific company)

## Related concepts

* [People](people.md) = the entities that relationships connect
