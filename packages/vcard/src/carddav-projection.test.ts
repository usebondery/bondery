import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generatePerson, makePerson } from "#carddav.fixtures.js";
import { canonicalJson, projectionEtag } from "#carddav-etag.js";
import {
  changedFieldGroups,
  emptyCardExtras,
  joinHeadline,
  projectCard,
  splitHeadline,
} from "#carddav-projection.js";

const ETAG_V3_RE = /^"[A-Za-z0-9_-]{27}-3"$/;
const ETAG_V4_RE = /^"[A-Za-z0-9_-]{27}-4"$/;

describe("headline", () => {
  it("splits both forms into title and organization", () => {
    assert.deepEqual(splitHeadline("Engineer @ Acme"), { org: "Acme", title: "Engineer" });
    assert.deepEqual(splitHeadline("Engineer @Acme"), { org: "Acme", title: "Engineer" });
    assert.deepEqual(splitHeadline("@Acme"), { org: "Acme", title: null });
  });

  it("keeps any other headline as a title", () => {
    assert.deepEqual(splitHeadline("Engineer"), { org: null, title: "Engineer" });
    assert.deepEqual(splitHeadline("write to jane@acme.com"), {
      org: null,
      title: "write to jane@acme.com",
    });
    assert.deepEqual(splitHeadline("  "), { org: null, title: null });
  });

  it("joins title and organization into one headline that splits back", () => {
    for (const headline of ["Engineer @ Acme", "Engineer @Acme", "Engineer", "@Acme"]) {
      const { title, org } = splitHeadline(headline);
      const joined = joinHeadline(title, org);
      assert.deepEqual(splitHeadline(joined), { org, title });
    }
    assert.equal(joinHeadline("Engineer", "Acme"), "Engineer @Acme");
  });
});

describe("projectCard", () => {
  it("is stable under repeated projection and input order", () => {
    const person = makePerson({
      emails: [
        { preferred: false, sortOrder: 1, type: "work", value: "b@example.com" },
        { preferred: true, sortOrder: 0, type: "personal", value: "a@example.com" },
      ],
    });
    const projection = projectCard(person);
    assert.deepEqual(
      projection.emails.map((email) => email.value),
      ["a@example.com", "b@example.com"],
    );
    assert.equal(projection.emails[0]?.type, "home");
  });

  it("writes an unknown birthday year as --MM-DD and keeps a known year", () => {
    const yearless = projectCard(
      makePerson({ importantDates: [{ date: "1904-05-17", note: null, type: "birthday" }] }),
    );
    assert.equal(yearless.birthday, "--05-17");
    const dated = projectCard(
      makePerson({ importantDates: [{ date: "1990-05-17", note: null, type: "birthday" }] }),
    );
    assert.equal(dated.birthday, "1990-05-17");
  });

  it("moves a profile URL out of the websites and keeps other URLs", () => {
    const projection = projectCard(
      makePerson({
        socials: [
          { handle: "https://www.linkedin.com/in/jane-doe", platform: "website" },
          { handle: "example.com", platform: "website" },
        ],
      }),
    );
    assert.deepEqual(projection.socialProfiles, [{ handle: "jane-doe", platform: "linkedin" }]);
    assert.deepEqual(projection.websites, ["https://example.com/"]);
  });

  it("leaves notes, tags and other card-less fields out", () => {
    const keys = Object.keys(projectCard(makePerson())).sort((a, b) => a.localeCompare(b));
    assert.deepEqual(keys, [
      "addresses",
      "birthday",
      "emails",
      "headline",
      "messengers",
      "name",
      "otherDates",
      "phones",
      "photoVersion",
      "socialProfiles",
      "websites",
    ]);
  });

  it("reports the field groups that changed", () => {
    const base = projectCard(makePerson());
    const changed = projectCard(
      makePerson({ firstName: "Janet", headline: "CEO", photoVersion: "2026-01-01T00:00:00.000Z" }),
    );
    assert.deepEqual(changedFieldGroups(base, changed), ["name", "headline", "photo"]);
  });
});

describe("projection etag", () => {
  it("is the same for the same card and differs by version suffix", () => {
    const projection = projectCard(generatePerson(7));
    const extras = emptyCardExtras();
    const v3 = projectionEtag(projection, extras, "3.0");
    assert.equal(v3, projectionEtag(projectCard(generatePerson(7)), emptyCardExtras(), "3.0"));
    assert.match(v3, ETAG_V3_RE);
    const v4 = projectionEtag(projection, extras, "4.0");
    assert.match(v4, ETAG_V4_RE);
    assert.equal(v3.slice(0, 28), v4.slice(0, 28));
  });

  it("changes when a field, the extras or the photo version changes", () => {
    const base = projectionEtag(projectCard(makePerson()), emptyCardExtras(), "3.0");
    assert.notEqual(
      base,
      projectionEtag(projectCard(makePerson({ firstName: "Janet" })), emptyCardExtras(), "3.0"),
    );
    assert.notEqual(
      base,
      projectionEtag(
        projectCard(makePerson({ photoVersion: "2026-01-01T00:00:00.000Z" })),
        emptyCardExtras(),
        "3.0",
      ),
    );
    assert.notEqual(
      base,
      projectionEtag(
        projectCard(makePerson()),
        { namePrefix: "Dr.", nameSuffix: "", properties: [] },
        "3.0",
      ),
    );
  });

  it("serializes with sorted keys", () => {
    const json = canonicalJson(projectCard(makePerson()), emptyCardExtras());
    assert.ok(json.startsWith('{"extras":{'));
    assert.ok(json.indexOf('"addresses"') < json.indexOf('"websites"'));
  });
});
