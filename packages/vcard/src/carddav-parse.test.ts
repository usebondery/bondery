import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateExtras, generatePerson, makePerson } from "#carddav.fixtures.js";
import { MAX_CARD_EXTRAS_BYTES, parseDeviceCard } from "#carddav-parse.js";
import { emptyCardExtras, projectCard } from "#carddav-projection.js";
import { serializeCardV3 } from "#serialize-v3.js";

const UID = "urn:uuid:0192f0aa-0000-7000-8000-000000000001";
const FIXED_POINT_SEEDS = 300;

function card(...lines: string[]): string {
  return `${["BEGIN:VCARD", ...lines, "END:VCARD"].join("\r\n")}\r\n`;
}

function person(text: string, defaultCountry?: string) {
  const result = parseDeviceCard(text, { defaultCountry });
  assert.equal(result.kind, "person", JSON.stringify(result));
  if (result.kind !== "person") {
    throw new Error("not a person");
  }
  return result;
}

describe("fixed point", () => {
  it("serialize, parse and serialize again gives the same bytes", () => {
    for (let seed = 1; seed <= FIXED_POINT_SEEDS; seed += 1) {
      const input = generatePerson(seed);
      const projection = projectCard(input);
      const extras = generateExtras(seed);
      const jpegBytes =
        seed % 3 === 0 ? new Uint8Array([0xff, 0xd8, 0, seed % 256, 0xff, 0xd9]) : undefined;
      const first = serializeCardV3(projection, {
        extras,
        photo: jpegBytes ? { jpegBytes } : undefined,
        uid: UID,
      });

      const parsed = person(first);
      assert.deepEqual(parsed.projection, { ...projection, photoVersion: null }, `seed ${seed}`);
      assert.equal(parsed.uid, UID);

      const second = serializeCardV3(parsed.projection, {
        extras: parsed.extras,
        photo: parsed.photo ? { jpegBytes: parsed.photo.bytes } : undefined,
        uid: parsed.uid,
      });
      assert.equal(second, first, `seed ${seed}`);
    }
  });

  it("holds for a person with no name that shows an email", () => {
    const input = makePerson({
      emails: [{ preferred: true, sortOrder: 0, type: "home", value: "only@example.com" }],
      firstName: "",
      lastName: null,
    });
    const first = serializeCardV3(projectCard(input), { extras: emptyCardExtras(), uid: UID });
    assert.ok(first.includes("\r\nFN:only@example.com\r\n"));
    const parsed = person(first);
    assert.equal(parsed.projection.name.first, "");
    assert.equal(
      serializeCardV3(parsed.projection, { extras: parsed.extras, uid: parsed.uid }),
      first,
    );
  });
});

describe("parseDeviceCard", () => {
  it("reads a real Apple card: labels, omitted year, pref and a photo", () => {
    const parsed = person(
      card(
        "VERSION:3.0",
        "PRODID:-//Apple Inc.//iOS 18//EN",
        "N:Doe;Jane;Marie;Dr.;Jr.",
        "FN:Dr. Jane Marie Doe Jr.",
        "NICKNAME:Janie",
        "ORG:Acme;Sales",
        "TITLE:Engineer",
        "item1.EMAIL;type=INTERNET;type=HOME;type=pref:jane@example.com",
        "item1.X-ABLabel:_$!<Other>!$_",
        "TEL;type=IPHONE;type=CELL;type=VOICE;type=pref:+420 601 234 567",
        "TEL;type=WORK;type=VOICE:+420211222333",
        "item2.ADR;type=HOME;type=pref:;;Main St 1\\, flat 4;Praha;;11000;Česko",
        "item2.X-ABADR:cz",
        "item3.URL;type=pref:https\\://example.com",
        "item3.X-ABLabel:_$!<HomePage>!$_",
        "BDAY;X-APPLE-OMIT-YEAR=1604:1604-05-17",
        "item4.X-ABDATE;type=pointer:2015-06-20",
        "item4.X-ABLabel:_$!<Anniversary>!$_",
        "NOTE:Met at\\nthe fair",
        "PHOTO;ENCODING=b;TYPE=JPEG:/9j/2Q==",
        "REV:2026-01-01T00:00:00Z",
        "UID:ABC-123",
      ),
    );
    const { projection, extras } = parsed;
    assert.equal(parsed.uid, "ABC-123");
    assert.deepEqual(projection.name, { first: "Jane", last: "Doe", middle: "Marie" });
    assert.deepEqual(projection.headline, { org: "Acme", title: "Engineer" });
    assert.deepEqual(projection.phones, [
      { preferred: true, type: "mobile", value: "+420601234567" },
      { preferred: false, type: "work", value: "+420211222333" },
    ]);
    assert.deepEqual(projection.emails, [
      { preferred: true, type: "home", value: "jane@example.com" },
    ]);
    assert.equal(projection.addresses[0]?.line1, "Main St 1, flat 4");
    assert.deepEqual(projection.websites, ["https://example.com"]);
    assert.equal(projection.birthday, "--05-17");
    assert.deepEqual(projection.otherDates, [
      { date: "2015-06-20", note: "", type: "anniversary" },
    ]);
    assert.deepEqual(Array.from(parsed.photo?.bytes ?? []), [0xff, 0xd8, 0xff, 0xd9]);
    assert.equal(parsed.photo?.mediaType, "image/jpeg");
    assert.equal(extras.namePrefix, "Dr.");
    assert.equal(extras.nameSuffix, "Jr.");
    assert.deepEqual(
      extras.properties.map((entry) => `${entry.group ?? ""}.${entry.name}`),
      [".NICKNAME", "item2.X-ABADR", ".NOTE"],
    );
  });

  it("reads a vCard 4.0 card with a data URI photo and ANNIVERSARY", () => {
    const parsed = person(
      card(
        "VERSION:4.0",
        "UID:urn:uuid:4",
        "FN:Jane Doe",
        "N:Doe;Jane;;;",
        "KIND:individual",
        "TEL;VALUE=uri;TYPE=cell,voice;PREF=1:tel:+420601234567",
        "ANNIVERSARY:20150620",
        "PHOTO:data:image/jpeg;base64,/9j/2Q==",
      ),
    );
    assert.equal(parsed.projection.phones[0]?.preferred, true);
    assert.equal(parsed.projection.otherDates[0]?.type, "anniversary");
    assert.equal(parsed.photo?.bytes.length, 4);
    assert.deepEqual(parsed.extras.properties, []);
  });

  it("splits FN when N is empty, and reads national numbers with the default country", () => {
    const parsed = person(
      card("VERSION:3.0", "UID:x", "N:;;;;", "FN:Jane Marie Doe", "TEL:601 234 567"),
      "CZ",
    );
    assert.deepEqual(parsed.projection.name, { first: "Jane", last: "Doe", middle: "Marie" });
    assert.equal(parsed.projection.phones[0]?.value, "+420601234567");
  });

  it("reads both headline forms from TITLE and ORG", () => {
    const parsed = person(card("VERSION:3.0", "UID:x", "N:Doe;Jane;;;", "TITLE:Engineer @ Acme"));
    assert.deepEqual(parsed.projection.headline, { org: "Acme", title: "Engineer" });
  });

  it("keeps the extras with group and parameters, and drops the label of a mapped property", () => {
    const parsed = person(
      card(
        "VERSION:3.0",
        "UID:x",
        "N:Doe;Jane;;;",
        "item1.TEL:+420601234567",
        "item1.X-ABLabel:Chata",
        "item2.X-ABRELATEDNAMES;type=pointer:Sam",
        "item2.X-ABLabel:_$!<Brother>!$_",
        "X-CUSTOM;X-FLAG=a:b",
        "CATEGORIES:friends,work",
      ),
    );
    assert.deepEqual(parsed.extras.properties, [
      {
        group: "item2",
        name: "X-ABRELATEDNAMES",
        parameters: [{ name: "TYPE", values: ["pointer"] }],
        value: "Sam",
      },
      { group: "item2", name: "X-ABLABEL", parameters: [], value: "_$!<Brother>!$_" },
      {
        group: undefined,
        name: "X-CUSTOM",
        parameters: [{ name: "X-FLAG", values: ["a"] }],
        value: "b",
      },
      { group: undefined, name: "CATEGORIES", parameters: [], value: "friends,work" },
    ]);
  });

  it("never keeps VERSION, PRODID, REV, UID or mapped names in extras", () => {
    const parsed = person(
      card(
        "VERSION:3.0",
        "PRODID:x",
        "REV:y",
        "UID:z",
        "N:Doe;Jane;;;",
        "FN:Jane Doe",
        "TITLE:a",
        "TITLE:b",
        "ORG:c",
        "TEL:+1",
        "EMAIL:a@b.c",
        "ADR:;;;;;;",
        "URL:https://x.example",
        "PHOTO;VALUE=uri:https://x.example/p.jpg",
      ),
    );
    assert.deepEqual(parsed.extras.properties, []);
  });

  it("keeps unmapped IMPP and social profiles as extras", () => {
    const parsed = person(
      card(
        "VERSION:3.0",
        "UID:x",
        "N:Doe;Jane;;;",
        "IMPP;X-SERVICE-TYPE=Skype:skype:jane",
        "X-SOCIALPROFILE;type=twitter:https://twitter.com/jane",
      ),
    );
    assert.deepEqual(
      parsed.extras.properties.map((entry) => entry.name),
      ["IMPP", "X-SOCIALPROFILE"],
    );
  });

  it("decodes quoted-printable extras into plain extras", () => {
    const parsed = person(
      card(
        "VERSION:2.1",
        "UID:x",
        "N:Doe;Jane;;;",
        "NOTE;ENCODING=QUOTED-PRINTABLE;CHARSET=UTF-8:Caf=C3=A9=0Aline",
      ),
    );
    assert.deepEqual(parsed.extras.properties[0]?.parameters, []);
    assert.equal(parsed.extras.properties[0]?.value, "Café\\nline");
  });

  it("returns an opaque result for a group card, in 3.0 and 4.0 forms", () => {
    const apple = parseDeviceCard(
      card(
        "VERSION:3.0",
        "UID:group-1",
        "X-ADDRESSBOOKSERVER-KIND:group",
        "FN:Family",
        "X-ADDRESSBOOKSERVER-MEMBER:urn:uuid:1",
      ),
    );
    assert.deepEqual(apple, { kind: "opaque", uid: "group-1" });
    const standard = parseDeviceCard(
      card("VERSION:4.0", "UID:group-2", "KIND:group", "FN:Family", "MEMBER:urn:uuid:1"),
    );
    assert.deepEqual(standard, { kind: "opaque", uid: "group-2" });
    const org = parseDeviceCard(card("VERSION:4.0", "UID:org-1", "KIND:org", "FN:Acme"));
    assert.deepEqual(org, { kind: "opaque", uid: "org-1" });
  });

  it("returns typed errors for broken input and a missing UID", () => {
    assert.equal(parseDeviceCard("not a vcard").kind, "error");
    const missingUid = parseDeviceCard(card("VERSION:3.0", "N:Doe;Jane;;;"));
    assert.deepEqual(missingUid.kind === "error" && missingUid.code, "missing_uid");
  });

  it("rejects extras above 64 KB with a typed error", () => {
    const big = "x".repeat(1000);
    const lines = Array.from({ length: 70 }, (_, index) => `X-FILL-${index}:${big}`);
    const result = parseDeviceCard(card("VERSION:3.0", "UID:x", "N:Doe;Jane;;;", ...lines));
    assert.equal(result.kind, "error");
    assert.equal(result.kind === "error" && result.code, "extras_too_large");
    assert.ok(70 * 1000 > MAX_CARD_EXTRAS_BYTES);

    const small = parseDeviceCard(
      card("VERSION:3.0", "UID:x", "N:Doe;Jane;;;", ...lines.slice(0, 10)),
    );
    assert.equal(small.kind, "person");
  });

  it("reads Apple labelled dates back to type and note", () => {
    const parsed = person(
      card(
        "VERSION:3.0",
        "UID:x",
        "N:Doe;Jane;;;",
        "item1.X-ABDATE;type=pointer;X-APPLE-OMIT-YEAR=1604:1604-02-29",
        "item1.X-ABLabel:Name day: Aunt Eva",
        "item2.X-ABDATE;type=pointer:2001-01-02",
        "item2.X-ABLabel:Moved to Prague",
      ),
    );
    assert.deepEqual(parsed.projection.otherDates, [
      { date: "--02-29", note: "Aunt Eva", type: "nameday" },
      { date: "2001-01-02", note: "Moved to Prague", type: "other" },
    ]);
  });
});
