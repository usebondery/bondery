# @bondery/vcard

Internal vCard parsing and serialization utilities for Bondery.

## Scope

- Parses vCard 2.1, 3.0, and 4.0 input.
- Serializes standards-compliant vCard 4.0 output.
- Preserves unknown X- and IANA properties in the raw document model.
- Normalizes common legacy mobile export variants, including inline base64 media.

## Public API

- `parseVCards(input)` parses one or more VCARD entities into raw and normalized models.
- `parseVCard(input)` parses a single VCARD entity.
- `serializeVCard(card)` emits RFC 6350-compliant text/vcard output.
- `contactToVCard(contact)` maps a Bondery contact into a normalized vCard.
- `vCardToContactDraft(card)` maps a parsed vCard into a contact-shaped draft suitable for import flows.
- `attachMedia(card, property, attachment)` attaches PHOTO, LOGO, SOUND, or KEY values.
- `createDataUriAttachment(data, mediaType)` converts binary data into a data URI.

## CardDAV API

The CardDAV server keeps one projection per person. A projection holds the fields a device card shows. A device owns everything else, called the extras. The server stores both and renders vCard text from them.

- `projectCard(input)` maps a `CardDavPersonInput` to a `CardProjection`. The projection is canonical and version-neutral. Every list has one stable order.
- `CARD_FIELD_GROUPS`, `readFieldGroup(projection, group)` and `changedFieldGroups(a, b)` address the groups a three-way merge compares: `name`, `headline`, `phones`, `emails`, `addresses`, `websitesAndSocials`, `dates`, `photo`.
- `splitHeadline(headline)` and `joinHeadline(title, org)` map between a headline and title plus organization. "Title @ Org" and "Title @Org" both split into title and org. The join gives "Title @Org".
- `canonicalJson(projection, extras)` gives deterministic JSON with sorted keys.
- `projectionEtag(projection, extras, version)` gives a strong, quoted ETag: 27 characters of base64url SHA-256, then `-3` or `-4`.
- `serializeCardV3(projection, { uid, extras, photo? })` writes vCard 3.0 in the Apple dialect.
- `parseDeviceCard(text, { defaultCountry? })` reads a card from a device. It returns one of:
  - `{ kind: "person", uid, projection, extras, photo? }` for an individual card (vCard 2.1, 3.0 or 4.0).
  - `{ kind: "opaque", uid }` for a group card (`X-ADDRESSBOOKSERVER-KIND:group`, `KIND:group` or any other kind). The caller stores the raw text as it is.
  - `{ kind: "error", code, message }` with `code` one of `invalid_vcard`, `missing_uid` and `extras_too_large`. The caller answers `507` for `extras_too_large`.

### Card rules

- The projection leaves out notes, tags, groups, location, timezone, language, keep-in-touch and LinkedIn history.
- A date with year 1904 has no year. The writer gives it as `BDAY;X-APPLE-OMIT-YEAR=1604:1604-MM-DD`. Other dates are `itemN.X-ABDATE` with an `itemN.X-ABLabel`.
- A profile URL of LinkedIn, Instagram or Facebook becomes a social profile. Any other URL stays a website.
- WhatsApp and Signal are `IMPP` with `X-SERVICE-TYPE`. Other `IMPP` and `X-SOCIALPROFILE` values stay in the extras.
- The writer never emits `REV`. A revision would change the text of an unchanged card, and the card would not reach a fixed point.
- Same input gives the same bytes. `serializeCardV3(parse(serializeCardV3(p)).projection)` equals `serializeCardV3(p)`.
- Device cards carry data Bondery does not store. The extras keep it: every unmapped property with its group and parameters, and the `N` prefix and suffix. Extras never hold `VERSION`, `PRODID`, `REV`, `UID`, a mapped property or the label of a mapped property. Extras never override a mapped field. Serialized extras are at most 64 KB.
- The reader keeps the first `TITLE`, the first component of `ORG` and the first `N`. It drops the other values of these. It reads `FN` only when `N` has no name. Photos by URL are dropped. Only inline photos reach `photo`.
- The reader does not set `photoVersion`. The caller sets it after it stores the photo.
- A card with no name shows the first email or phone as `FN`. The reader gives that card no name. The caller applies the rule "first name is the first email" when it creates a person.

## Notes

- Output is UTF-8 with CRLF line endings.
- `serializeVCard` always emits `VERSION:4.0` immediately after `BEGIN:VCARD`. `serializeCardV3` emits `VERSION:3.0`.
- Both serializers fold lines at 75 octets without splitting UTF-8 code points.
- `pnpm --filter @bondery/vcard run test` runs the unit tests.
