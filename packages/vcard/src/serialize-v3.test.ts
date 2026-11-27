import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { makePerson } from "#carddav.fixtures.js";
import { emptyCardExtras, projectCard } from "#carddav-projection.js";
import { serializeCardV3 } from "#serialize-v3.js";

const UID = "urn:uuid:0192f0aa-0000-7000-8000-000000000001";
const FOLDED_BREAK_RE = /\r\n /g;
const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
const JPEG_BASE64 = "/9j/2Q==";
const MAX_LINE_OCTETS = 75;

function write(person = makePerson(), extras = emptyCardExtras(), jpeg?: Uint8Array): string {
  return serializeCardV3(projectCard(person), {
    extras,
    photo: jpeg ? { jpegBytes: jpeg } : undefined,
    uid: UID,
  });
}

/** True when `line` is one whole content line of the card. */
function hasLine(text: string, line: string): boolean {
  return text.includes(`\r\n${line}\r\n`);
}

describe("serializeCardV3", () => {
  it("writes a minimal card with CRLF line endings and no REV", () => {
    assert.equal(
      write(),
      [
        "BEGIN:VCARD",
        "VERSION:3.0",
        "PRODID:-//Bondery//CardDAV//EN",
        `UID:${UID}`,
        "N:Doe;Jane;;;",
        "FN:Jane Doe",
        "END:VCARD",
        "",
      ].join("\r\n"),
    );
  });

  it("writes channels with Apple types and pref", () => {
    const text = write(
      makePerson({
        emails: [{ preferred: false, sortOrder: 0, type: "work", value: "jane@example.com" }],
        phones: [
          { preferred: true, prefix: "+420", sortOrder: 0, type: "mobile", value: "601 234 567" },
          { preferred: false, prefix: "", sortOrder: 1, type: "work", value: "+4202111222" },
        ],
      }),
    );
    assert.ok(hasLine(text, "TEL;TYPE=CELL,pref:+420601234567"));
    assert.ok(hasLine(text, "TEL;TYPE=WORK:+4202111222"));
    assert.ok(hasLine(text, "EMAIL;TYPE=INTERNET,WORK:jane@example.com"));
  });

  it("writes TITLE and ORG from a headline in both forms", () => {
    for (const headline of ["Engineer @ Acme", "Engineer @Acme"]) {
      const text = write(makePerson({ headline }));
      assert.ok(text.includes("\r\nTITLE:Engineer\r\nORG:Acme\r\n"));
    }
    assert.ok(!write(makePerson({ headline: "Engineer" })).includes("ORG:"));
  });

  it("writes a birthday with and without a year", () => {
    const withYear = write(
      makePerson({ importantDates: [{ date: "1990-05-17", note: null, type: "birthday" }] }),
    );
    assert.ok(hasLine(withYear, "BDAY:1990-05-17"));
    const withoutYear = write(
      makePerson({ importantDates: [{ date: "1904-05-17", note: null, type: "birthday" }] }),
    );
    assert.ok(hasLine(withoutYear, "BDAY;X-APPLE-OMIT-YEAR=1604:1604-05-17"));
  });

  it("writes other dates as labelled Apple dates", () => {
    const text = write(
      makePerson({
        importantDates: [
          { date: "2015-06-20", note: null, type: "anniversary" },
          { date: "1904-02-29", note: "Aunt Eva", type: "nameday" },
        ],
      }),
    );
    assert.ok(hasLine(text, "item1.X-ABDATE;TYPE=pointer;X-APPLE-OMIT-YEAR=1604:1604-02-29"));
    assert.ok(hasLine(text, "item1.X-ABLABEL:Name day: Aunt Eva"));
    assert.ok(hasLine(text, "item2.X-ABDATE;TYPE=pointer:2015-06-20"));
    assert.ok(hasLine(text, "item2.X-ABLABEL:_$!<Anniversary>!$_"));
  });

  it("writes socials and messengers", () => {
    const text = write(
      makePerson({
        socials: [
          { handle: "jane-doe", platform: "linkedin" },
          { handle: "https://example.com", platform: "website" },
          { handle: "+420601234567", platform: "whatsapp" },
        ],
      }),
    );
    assert.ok(hasLine(text, "URL:https://example.com"));
    assert.ok(hasLine(text, "X-SOCIALPROFILE;TYPE=linkedin:https://linkedin.com/in/jane-doe"));
    assert.ok(hasLine(text, "IMPP;X-SERVICE-TYPE=WhatsApp:whatsapp:+420601234567"));
  });

  it("escapes text per RFC 2426", () => {
    const text = write(makePerson({ lastName: "Smith, Jr; Esq\\n" }));
    assert.ok(hasLine(text, "N:Smith\\, Jr\\; Esq\\\\n;Jane;;;"));
  });

  it("folds at 75 octets without splitting a code point", () => {
    const text = write(makePerson({ lastName: "Ž".repeat(120) }));
    const lines = text.split("\r\n").slice(0, -1);
    for (const line of lines) {
      assert.ok(
        Buffer.byteLength(line, "utf8") <= MAX_LINE_OCTETS,
        `line too long: ${line.length}`,
      );
    }
    assert.ok(lines.some((line) => line.startsWith(" ")));
    const unfolded = text.replace(FOLDED_BREAK_RE, "");
    assert.ok(unfolded.includes(`N:${"Ž".repeat(120)};Jane;;;`));
  });

  it("writes the photo as inline base64 JPEG and extras after it, verbatim", () => {
    const extras = {
      namePrefix: "Dr.",
      nameSuffix: "",
      properties: [
        { name: "NOTE", parameters: [], value: "Hello\\, world" },
        {
          group: "item7",
          name: "X-ABRELATEDNAMES",
          parameters: [{ name: "TYPE", values: ["pointer"] }],
          value: "Sam",
        },
      ],
    };
    const text = write(makePerson(), extras, JPEG_BYTES);
    assert.ok(hasLine(text, "N:Doe;Jane;;Dr.;"));
    assert.ok(
      text.includes(`\r\nPHOTO;ENCODING=b;TYPE=JPEG:${JPEG_BASE64}\r\nNOTE:Hello\\, world\r\n`),
    );
    assert.ok(text.endsWith("\r\nitem7.X-ABRELATEDNAMES;TYPE=pointer:Sam\r\nEND:VCARD\r\n"));
  });

  it("never lets an extra override a mapped property", () => {
    const extras = {
      namePrefix: "",
      nameSuffix: "",
      properties: [
        { name: "TITLE", parameters: [], value: "Spoofed" },
        { name: "UID", parameters: [], value: "other" },
        { name: "REV", parameters: [], value: "2026" },
      ],
    };
    const text = write(makePerson(), extras);
    assert.ok(!(text.includes("TITLE:") || text.includes("REV:") || text.includes("UID:other")));
  });

  it("gives labelled groups a name that no extra uses", () => {
    const extras = {
      namePrefix: "",
      nameSuffix: "",
      properties: [{ group: "item1", name: "X-FOO", parameters: [], value: "bar" }],
    };
    const text = write(
      makePerson({ importantDates: [{ date: "2015-06-20", note: null, type: "anniversary" }] }),
      extras,
    );
    assert.ok(text.includes("\r\nitem2.X-ABDATE;"));
  });

  it("is deterministic", () => {
    assert.equal(write(), write());
  });
});
