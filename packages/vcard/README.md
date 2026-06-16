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

## Notes

- Output is UTF-8 with CRLF line endings.
- `VERSION:4.0` is always emitted immediately after `BEGIN:VCARD`.
- The serializer folds lines at 75 octets without splitting UTF-8 code points.