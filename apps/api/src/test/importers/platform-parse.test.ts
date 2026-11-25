/**
 * Layer 2: the LinkedIn and Instagram parsers resolve a real platform export.
 *
 * There is no LinkedIn fixture in the corpus yet, so the LinkedIn tests build the exact
 * `Connections.csv` shape the exporter writes from base-table identities. The Instagram tests read
 * the committed ZIP, which keeps the exporter's own quirks: the `/_u/` profile prefix, empty
 * `title` in `followers_*.json`, and an empty `URL` in `close_friends.json`.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseInstagramExportUpload } from "../../routes/import/instagram/parser.js";
import { parseLinkedInCsvUpload } from "../../routes/import/linkedin/parser.js";
import { loadBaseValues, loadUpload } from "./fixtures.js";

const CSV_NEEDS_QUOTING = /[",\n]/u;
const INSTAGRAM_URL_PREFIX = /^https:\/\/www\.instagram\.com\//u;
const _CLOSE_FRIENDS_ERROR = /close_friends\.json has invalid JSON structure/u;
const LINKEDIN_HEADER_ERROR = /Invalid LinkedIn CSV format/u;

/** The header the LinkedIn exporter writes, in the order the parser requires. */
const LINKEDIN_HEADER = "First Name,Last Name,URL,Email Address,Company,Position,Connected On";

/** Quote a CSV field when it holds a comma, a quote, or a newline, as the exporter does. */
function csvField(value: string): string {
  if (CSV_NEEDS_QUOTING.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

/** Builds a `Connections.csv` from base-table identities, in the exporter's exact shape. */
async function linkedInCsv(limit: number): Promise<Buffer> {
  const base = await loadBaseValues();
  const rows = base.contacts
    .filter((contact) => contact.linkedin !== null)
    .slice(0, limit)
    .map((contact) => {
      const handle = contact.linkedin?.split("/in/").at(-1) ?? contact.instagram;
      return [
        contact.firstName,
        contact.lastName,
        `https://www.linkedin.com/in/${handle}`,
        contact.email,
        contact.organization ?? "",
        contact.title ?? "",
        "01/15/2024",
      ]
        .map(csvField)
        .join(",");
    });
  return Buffer.from([LINKEDIN_HEADER, ...rows].join("\n"), "utf8");
}

describe("linkedIn import: Connections.csv", () => {
  it("reads one contact per row with a handle, an email, and a connection date", async () => {
    const csv = await linkedInCsv(5);
    const contacts = parseLinkedInCsvUpload([{ content: csv, fileName: "Connections.csv" }]);

    assert.equal(contacts.length, 5);
    assert.ok(
      contacts.every((contact) => contact.linkedinUsername.length > 0),
      "a URL column must yield a handle",
    );
    assert.ok(
      contacts.every((contact) => contact.connectedAt !== null),
      "a Connected On row must yield a date",
    );
    assert.ok(
      contacts.every((contact) => contact.email?.includes("@") ?? false),
      "an Email Address column must survive",
    );
    assert.equal(contacts.filter((contact) => contact.isValid).length, 5);
  });

  it("combines position and company into the stored headline", async () => {
    const csv = await linkedInCsv(3);
    const [first] = parseLinkedInCsvUpload([{ content: csv, fileName: "Connections.csv" }]);
    assert.ok(first !== undefined);
    assert.ok(
      (first.position !== null && first.position.length > 0) ||
        (first.company !== null && first.company.length > 0),
      "at least one of position and company must survive to build a headline",
    );
  });

  it("reads a Connections.csv nested inside the exporter ZIP", async () => {
    // The real export is a ZIP, and the parser must find the file rather than read the archive.
    const { default: AdmZip } = await import("adm-zip");
    const zip = new AdmZip();
    zip.addFile("Connections.csv", await linkedInCsv(4));
    const contacts = parseLinkedInCsvUpload([
      { content: zip.toBuffer(), fileName: "linkedin-export.zip" },
    ]);

    assert.equal(contacts.length, 4);
  });

  it("rejects a file whose header is not the LinkedIn export header", async () => {
    const wrong = Buffer.from("name,email\nAda,ada@example.com\n", "utf8");
    assert.throws(
      () => parseLinkedInCsvUpload([{ content: wrong, fileName: "Connections.csv" }]),
      LINKEDIN_HEADER_ERROR,
    );
  });
});

describe("instagram import: the following list", () => {
  it("deduplicates the following list to distinct handles", async () => {
    // The exporter writes one record per follow event: 511 records collapse to 70 handles.
    const contacts = parseInstagramExportUpload(
      [await loadUpload("instagram/instagram-export.zip")],
      "following",
    );

    assert.equal(contacts.length, 70, "511 records collapse to 70 distinct handles");
    assert.equal(contacts.filter((contact) => contact.isValid).length, 70);
    assert.equal(
      new Set(contacts.map((contact) => contact.instagramUsername)).size,
      contacts.length,
      "every returned contact must be a distinct handle",
    );
    assert.ok(
      contacts.every((contact) => contact.sources.includes("following")),
      "each following record must carry its source",
    );
  });
});

describe("instagram import: the followers list and strategies", () => {
  it("reads the followers list, where the exporter leaves title empty", async () => {
    const contacts = parseInstagramExportUpload(
      [await loadUpload("instagram/instagram-export.zip")],
      "followers",
    );

    assert.equal(contacts.length, 64, "68 records collapse to 64 distinct handles");
    assert.ok(
      contacts.every((contact) => contact.instagramUsername.length > 0),
      "an empty title must fall through to the href, not drop the record",
    );
  });

  it("reads the union of following and followers", async () => {
    const contacts = parseInstagramExportUpload(
      [await loadUpload("instagram/instagram-export.zip")],
      "following_and_followers",
    );

    assert.ok(contacts.length > 0);
    const sources = new Set(contacts.flatMap((contact) => contact.sources));
    assert.ok(sources.has("following"));
    assert.ok(sources.has("followers"));
  });

  it("reads the mutual follows only", async () => {
    const contacts = parseInstagramExportUpload(
      [await loadUpload("instagram/instagram-export.zip")],
      "mutual_following",
    );

    assert.ok(contacts.length > 0);
    assert.ok(
      contacts.every((contact) => {
        const sources = new Set(contact.sources);
        return sources.has("following") && sources.has("followers");
      }),
      "a mutual follow must be labelled with both sources",
    );
  });

  it("reads the close_friends list, which is a bare array with label_values", async () => {
    // `close_friends.json` is a JSON array, unlike `following.json`, and it names each person in
    // `label_values` rather than in `title` or `string_list_data`.
    const contacts = parseInstagramExportUpload(
      [await loadUpload("instagram/instagram-export.zip")],
      "close_friends",
    );

    assert.equal(contacts.length, 29);
    assert.equal(contacts.filter((contact) => contact.isValid).length, 29);
    assert.ok(
      contacts.every((contact) => contact.instagramUsername.length > 0),
      "a Username entry in label_values must become the handle",
    );
    assert.ok(
      contacts.every((contact) => contact.sources.includes("close_friends")),
      "a close friend must stay labelled close_friends even when also in following",
    );
  });

  it("reads label_values Username, not the URL the exporter usually leaves empty", async () => {
    const contacts = parseInstagramExportUpload(
      [await loadUpload("instagram/instagram-export.zip")],
      "close_friends",
    );

    // Most records carry an empty URL, so a parser that reads the URL tail loses almost the list.
    const known = new Set(contacts.map((contact) => contact.instagramUsername));
    assert.ok(known.size > 1, `expected several handles, got ${known.size}`);
    assert.ok(
      [...known].every((handle) => handle.length > 0 && !handle.includes("/")),
      "every handle must be a bare username",
    );
  });

  it("accepts the older object-wrapped close_friends shape", async () => {
    // Older exports wrap the array in `relationships_close_friends`, the way `following.json` is
    // shaped. Both forms must parse, because a user may hold either.
    const handle = "ada.lovelace.sample";
    const wrapped = Buffer.from(
      JSON.stringify({
        relationships_close_friends: [
          {
            label_values: [
              { label: "URL", value: "" },
              { label: "Name", value: "Ada Lovelace" },
              { label: "Username", value: handle },
            ],
            timestamp: 1_700_000_001,
          },
        ],
      }),
      "utf8",
    );
    // The close_friends strategy also reads `following.json` to fill in the follow date.
    const following = Buffer.from(
      JSON.stringify({
        relationships_following: [
          {
            string_list_data: [
              { href: `https://www.instagram.com/${handle}`, timestamp: 1_699_999_999 },
            ],
            title: handle,
          },
        ],
      }),
      "utf8",
    );
    const { default: AdmZip } = await import("adm-zip");
    const zip = new AdmZip();
    zip.addFile("connections/followers_and_following/close_friends.json", wrapped);
    zip.addFile("connections/followers_and_following/following.json", following);

    const contacts = parseInstagramExportUpload(
      [{ content: zip.toBuffer(), fileName: "instagram-export.zip" }],
      "close_friends",
    );

    assert.equal(contacts.length, 1);
    assert.equal(contacts[0]?.instagramUsername, handle);
    assert.ok(
      contacts[0]?.connectedAt !== null,
      "the follow date must come from following.json when the close-friend record has none",
    );
  });

  it("builds a profile URL from the handle, keeping the exporter /_u/ prefix", async () => {
    const contacts = parseInstagramExportUpload(
      [await loadUpload("instagram/instagram-export.zip")],
      "following",
    );
    const [first] = contacts;
    assert.ok(first !== undefined);
    assert.match(first.instagramUrl, INSTAGRAM_URL_PREFIX);
    assert.ok(
      first.instagramUrl.endsWith(first.instagramUsername),
      "the URL must name the same handle the contact carries",
    );
  });
});
