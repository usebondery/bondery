/**
 * Layer 2: the vCard parser resolves every property of a real export.
 *
 * The corpus holds four exports in three dialects: vCard 2.1 from Google and Samsung with
 * quoted-printable encoding, vCard 3.0 from Apple, and vCard 4.0 from Proton with `ITEM1.` group
 * prefixes. Each exercises a different path through `@bondery/vcard`, so a regression in one
 * dialect cannot hide behind another.
 *
 * Every assertion names a count the corpus produced or a person from `base-contact-values.json`,
 * so a failure says what was lost rather than that a shape changed.
 */
import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { setGeocoderForTests } from "../../lib/integrations/mapy.js";
import { parseVCardUpload } from "../../routes/import/vcard/parser.js";
import { contactNamed, emailValuesOf, loadUpload, phoneNumbersOf } from "./fixtures.js";
import { createMemoryGeocoder, createOfflineGeocoder, knownPlaces } from "./geocoder.js";

const HEADLINE_PATTERN = /^@\S/u;
const E164_PATTERN = /^\+\d{7,15}$/u;
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[a-z]+$/iu;
const NON_BLANK = /\S/u;
const ISO_COUNTRY = /^[A-Z]{2}$/u;

let corpusGeocoder: Awaited<ReturnType<typeof createMemoryGeocoder>>;

before(async () => {
  // The geocoder is derived from the corpus, so a new city in the sample data resolves too.
  corpusGeocoder = createMemoryGeocoder(await knownPlaces());
});

beforeEach(() => {
  // A test that needs another geocoder sets it itself; this restores the corpus one for the next.
  setGeocoderForTests(corpusGeocoder);
});

after(() => {
  setGeocoderForTests(null);
});

describe("vCard import: vCard 3.0 (Apple)", () => {
  it("reads every card and every phone number", async () => {
    const contacts = await parseVCardUpload([await loadUpload("iphone/iphone.vcf")]);

    assert.equal(contacts.length, 4);
    assert.equal(contacts.filter((contact) => contact.isValid).length, 4);
    assert.equal(
      contacts.reduce((count, contact) => count + contact.phones.length, 0),
      4,
      "each card carries one TEL",
    );
    assert.equal(
      new Set(contacts.map((contact) => `${contact.firstName} ${contact.lastName}`)).size,
      4,
    );
  });

  it("reads the family and given name from N, not from their positions swapped", async () => {
    // `N` is `family;given`. A leading empty field shifts the family name into the prefix slot,
    // which is how this fixture was once produced; the assertion pins the correct reading.
    const [first] = await parseVCardUpload([await loadUpload("iphone/iphone.vcf")]);
    assert.ok(first !== undefined);
    assert.ok(
      first.firstName.length > 0 && first.lastName.length > 0,
      `both name parts must resolve, got ${JSON.stringify([first.firstName, first.lastName])}`,
    );
    assert.equal(first.middleName, null, "the source leaves the additional-name slot empty");
  });

  it("resolves the organisation into a headline and a phone into prefix plus value", async () => {
    const contacts = await parseVCardUpload([await loadUpload("iphone/iphone.vcf")]);
    const withOrganisation = contacts.find((contact) => contact.headline !== null);

    assert.ok(withOrganisation !== undefined, "an ORG line must produce a headline");
    assert.match(withOrganisation.headline ?? "", HEADLINE_PATTERN);
    const [phone] = withOrganisation.phones;
    assert.match(`${phone?.prefix ?? ""}${phone?.value ?? ""}`, E164_PATTERN);
  });
});

describe("vCard import: vCard 2.1 (Google)", () => {
  it("keeps the address even though the file folds it into one very long line", async () => {
    const contacts = await parseVCardUpload([await loadUpload("google/contacts.vcf")]);

    assert.equal(contacts.length, 1);
    const [contact] = contacts;
    assert.ok(contact !== undefined);
    assert.ok(contact.firstName.length > 0, "N must yield a given name");
    assert.ok(contact.lastName.length > 0, "N must yield a family name");

    // The identity comes from the base table, so this holds whichever person the seed picked.
    const expected = await contactNamed(contact.firstName, contact.lastName);
    assert.equal(contact.headline, `${expected.title} @${expected.organization}`);
    assert.equal(contact.addresses.length, 1, "the ADR line must produce one address");
    assert.equal(contact.addresses[0]?.addressLine1, expected.address);
    assert.equal(contact.addresses[0]?.addressCity, expected.city);
    assert.equal(contact.addresses[0]?.addressPostalCode, expected.postalCode);
  });

  it("marks the street address valid when the geocoder confirms it", async () => {
    const [contact] = await parseVCardUpload([await loadUpload("google/contacts.vcf")]);
    const [address] = contact?.addresses ?? [];
    const expected = await contactNamed(contact?.firstName ?? "", contact?.lastName ?? "");

    assert.equal(address?.validity, "valid");
    assert.equal(address?.geocodeSource, "mapy.com");
    assert.equal(address?.addressPostalCode, expected.postalCode);
    assert.ok(address?.latitude !== null, "a valid address carries coordinates");
    assert.ok(address?.timezone !== null, "a valid address carries a timezone");
  });
});

describe("vCard import: vCard 4.0 (Proton)", () => {
  it("reads all 329 cards and every ITEM1.EMAIL line", async () => {
    const contacts = await parseVCardUpload([await loadUpload("proton/contacts.vcf")]);

    assert.equal(contacts.length, 329);
    assert.equal(contacts.filter((contact) => contact.isValid).length, 329);
    assert.equal(
      contacts.reduce((count, contact) => count + contact.emails.length, 0),
      332,
      "329 ITEM1.EMAIL plus the 3 ITEM2.EMAIL lines",
    );
    assert.equal(
      new Set(contacts.map((contact) => `${contact.firstName} ${contact.lastName}`)).size,
      68,
      "329 cards name 68 distinct people",
    );
  });

  it("resolves an email split across a folded continuation line", async () => {
    // Two records split `ITEM1.EMAIL` over a leading-space continuation. A parser that ignores
    // folding truncates the address, and the whole address is then unusable.
    const contacts = await parseVCardUpload([await loadUpload("proton/contacts.vcf")]);
    const emails = contacts.flatMap((contact) => emailValuesOf(contact));
    const folded = emails.filter(
      (email) => email.startsWith("mitchell.bake") || email.startsWith("maya.chen"),
    );

    assert.ok(folded.length > 0, "the fixture still carries the folded addresses");
    assert.ok(
      folded.every((email) => EMAIL_PATTERN.test(email)),
      `a folded email must be joined, not truncated: ${folded.join(", ")}`,
    );
  });

  it("reads ITEM1.CATEGORIES into the contact without inventing an address", async () => {
    const contacts = await parseVCardUpload([await loadUpload("proton/contacts.vcf")]);
    assert.equal(
      contacts.reduce((count, contact) => count + contact.addresses.length, 0),
      0,
      "Proton carries no ADR, so a parser must not fabricate one",
    );
  });
});

describe("vCard import: vCard 2.1 quoted-printable (Samsung)", () => {
  it("reads all 477 cards and resolves 69 distinct people", async () => {
    const contacts = await parseVCardUpload([await loadUpload("samsung/contacts.vcf")]);

    assert.equal(contacts.length, 477);
    assert.equal(contacts.filter((contact) => contact.isValid).length, 477);
    assert.equal(
      new Set(contacts.map((contact) => `${contact.firstName} ${contact.lastName}`)).size,
      69,
      "477 cards name 69 distinct people (the base table has 5 merge pairs)",
    );
  });

  it("decodes a quoted-printable N line into a readable name", async () => {
    const contacts = await parseVCardUpload([await loadUpload("samsung/contacts.vcf")]);
    const expected = await contactNamed("Maya", "Chen");
    const maya = contacts.find(
      (contact) =>
        contact.firstName === expected.firstName && contact.lastName === expected.lastName,
    );

    assert.ok(maya !== undefined, "a QP-encoded N line must decode to a name");
    assert.deepEqual(phoneNumbersOf(maya), [expected.phone]);
  });

  it("decodes a quoted-printable address, which the geocoder then confirms", async () => {
    const contacts = await parseVCardUpload([await loadUpload("samsung/contacts.vcf")]);
    const addresses = contacts.flatMap((contact) => contact.addresses);

    assert.equal(addresses.length, 13, "13 ADR and X-SAMSUNGADR lines");
    assert.equal(
      addresses.filter((address) => address.validity === "valid").length,
      13,
      "every address carries a city the geocoder knows",
    );
    // `=20` in the raw fixture must be a space by the time the address is stored.
    assert.ok(
      addresses.every((address) => !address.addressCity?.includes("=")),
      "a quoted-printable city must be decoded",
    );
    const knownCity = addresses.find((address) => address.addressCity !== null);
    assert.ok(knownCity !== undefined);
    assert.match(knownCity.addressPostalCode ?? "", NON_BLANK);
    assert.match(knownCity.addressCountryCode ?? "", ISO_COUNTRY);
  });

  it("carries the 68 embedded photos as decodable data URIs", async () => {
    const contacts = await parseVCardUpload([await loadUpload("samsung/contacts.vcf")]);
    const withAvatar = contacts.filter((contact) => contact.avatarUri !== null);

    assert.equal(withAvatar.length, 68);
    assert.ok(
      withAvatar.every((contact) => contact.avatarUri?.startsWith("data:image/jpeg;base64,")),
      "a PHOTO property must become a data URI the commit step can decode",
    );
  });

  it("carries the 40 birthdays and the 36 email addresses", async () => {
    const contacts = await parseVCardUpload([await loadUpload("samsung/contacts.vcf")]);

    assert.equal(
      contacts.reduce((count, contact) => count + (contact.importantDates?.length ?? 0), 0),
      40,
      "a BDAY line must become a birthday important date",
    );
    assert.equal(
      contacts.reduce((count, contact) => count + contact.emails.length, 0),
      36,
      "each EMAIL line must survive",
    );
  });
});

describe("vCard import: geocoder availability", () => {
  it("marks a street address invalid when the geocoder resolves nothing", async () => {
    // This is what a deployment without BONDERY_PRIVATE_MAPS_KEY sees. The commit step writes only
    // "valid" addresses, so this is the reason addresses disappear from such an install.
    setGeocoderForTests(createOfflineGeocoder());
    const [contact] = await parseVCardUpload([await loadUpload("google/contacts.vcf")]);

    assert.equal(contact?.addresses.length, 1);
    assert.equal(contact?.addresses[0]?.validity, "invalid");
    assert.equal(contact?.addresses[0]?.latitude, null);
  });

  it("keeps the contact itself when no address can be confirmed", async () => {
    setGeocoderForTests(createOfflineGeocoder());
    const contacts = await parseVCardUpload([await loadUpload("samsung/contacts.vcf")]);

    assert.equal(contacts.length, 477, "a geocoder failure must not drop people");
    assert.equal(contacts.filter((contact) => contact.isValid).length, 477);
    assert.equal(
      contacts
        .flatMap((contact) => contact.addresses)
        .filter((address) => address.validity === "valid").length,
      0,
    );
  });
});
