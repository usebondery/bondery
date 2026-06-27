# Mobile Tags — Phase 2 Backlog

Phase 1 ships contact-level tagging and Settings tag management. The items below are deferred.

## Browse and navigate

- **`TagContactsScreen`** + route `app/(app)/tag/[id].tsx` — member list for a tag (mirror `GroupContactsScreen`)
- **`useNavigateToTag`** — chip tap on contact detail navigates to tag member list
- **`ContactsTagsHeader`** — horizontal tag chip row on the Contacts tab (mirror `ContactsGroupsHeader`)

## Bulk operations

- **`ContactsAddToTagsSheet`** — multi-select tags for selected contacts
- Extend **`contactsSelectionStore`** with tag sheet open/loading flags
- Add **Add to tags** action in **`ContactsSelectionActionBar`**

## Settings polish

- **`tagSort.ts`** + **`/settings/tag-sort`** — local sort preference over `fetchTags` results (mirror group sort)

## Tag editor enhancements

- **Member picker** in `TagEditSheet` edit mode — manage who has the tag from Settings (web `PeopleWithTagLabel`)

## List filtering (API-dependent)

- **`GET /api/contacts?tagId=…`** — not implemented on API or web today; `docs/concepts/tags.md` describes aspirational filter behavior
- Until API support exists, use `GET /api/tags/:id/contacts` via tag detail screen only
- Optional: show 1–2 tag chips on `ContactListItem` after performance review

## Reference

- Groups pattern: `apps/mobile/src/features/contacts/components/ContactGroupsSection.tsx`
- Web tags: `apps/webapp/src/app/(app)/app/components/tags/`
- API: `apps/api/src/routes/tags/index.ts`
