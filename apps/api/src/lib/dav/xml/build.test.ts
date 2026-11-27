import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { buildDavError, buildMultistatus } from "./build.js";
import { cardName, csName, davName } from "./names.js";
import { parseXmlTree } from "./tree.js";
import { type DavResponse, xmlElements, xmlEmpty, xmlEmptyElement, xmlText } from "./types.js";

const LINE_BREAKS = /\r\n/g;
const TRAILING_NEWLINE = /\n$/;

/** Reads a golden file. Git may check it out with CRLF, so line endings are normalized. */
function golden(name: string): string {
  const path = fileURLToPath(new URL(`./golden/${name}`, import.meta.url));
  return readFileSync(path, "utf8").replace(LINE_BREAKS, "\n").replace(TRAILING_NEWLINE, "");
}

const VCARD = 'BEGIN:VCARD\r\nVERSION:3.0\r\nFN:Anna & <Bob> "Q"\r\nEND:VCARD\r\n';

const BOOK_RESPONSE: DavResponse = {
  href: "/dav/addressbooks/u1/bondery/",
  propstats: [
    {
      props: [
        {
          name: davName("resourcetype"),
          value: xmlElements(
            xmlEmptyElement(davName("collection")),
            xmlEmptyElement(cardName("addressbook")),
          ),
        },
        { name: davName("displayname"), value: xmlText("Bondery") },
        { name: csName("getctag"), value: xmlText("https://usebondery.com/ns/sync/g1-7") },
        { name: davName("sync-token"), value: xmlText("https://usebondery.com/ns/sync/g1-7") },
        {
          name: davName("supported-report-set"),
          value: xmlElements(
            ...["addressbook-multiget", "addressbook-query"].map((name) => ({
              name: davName("supported-report"),
              value: xmlElements({
                name: davName("report"),
                value: xmlElements(xmlEmptyElement(cardName(name))),
              }),
            })),
          ),
        },
        {
          name: cardName("supported-address-data"),
          value: xmlElements({
            attributes: { "content-type": "text/vcard", version: "3.0" },
            name: cardName("address-data-type"),
            value: xmlEmpty,
          }),
        },
        {
          name: davName("current-user-privilege-set"),
          value: xmlElements(
            ...["read", "read-current-user-privilege-set"].map((name) => ({
              name: davName("privilege"),
              value: xmlElements(xmlEmptyElement(davName(name))),
            })),
          ),
        },
      ],
      status: 200,
    },
    {
      props: [{ name: { name: "unknown-prop", ns: "urn:example:custom" }, value: xmlEmpty }],
      status: 404,
    },
  ],
};

const CARD_RESPONSE: DavResponse = {
  href: "/dav/addressbooks/u1/bondery/019a.vcf",
  propstats: [
    {
      props: [
        { name: davName("getetag"), value: xmlText('"abc123"') },
        { name: cardName("address-data"), value: xmlText(VCARD) },
      ],
      status: 200,
    },
  ],
};

describe("buildMultistatus", () => {
  it("matches the golden file for a PROPFIND answer", () => {
    assert.equal(buildMultistatus([BOOK_RESPONSE]), golden("propfind-address-book.xml"));
  });

  it("matches the golden file for a sync-collection answer", () => {
    const responses: DavResponse[] = [
      CARD_RESPONSE,
      { href: "/dav/addressbooks/u1/bondery/gone.vcf", status: 404 },
    ];
    const syncToken = "https://usebondery.com/ns/sync/g1-8";
    assert.equal(buildMultistatus(responses, { syncToken }), golden("sync-collection.xml"));
  });

  it("is deterministic", () => {
    assert.equal(
      buildMultistatus([BOOK_RESPONSE, CARD_RESPONSE]),
      buildMultistatus([BOOK_RESPONSE, CARD_RESPONSE]),
    );
  });

  it("groups propstats that share a status and drops empty ones", () => {
    const xml = buildMultistatus([
      {
        href: "/a",
        propstats: [
          { props: [{ name: davName("getetag"), value: xmlText("1") }], status: 200 },
          { props: [], status: 404 },
          { props: [{ name: davName("displayname"), value: xmlText("x") }], status: 200 },
        ],
      },
    ]);
    assert.equal(xml.match(/<d:propstat>/g)?.length, 1);
    assert.equal(xml.match(/HTTP\/1\.1 200 OK/g)?.length, 1);
    assert.equal(xml.includes("404"), false);
  });

  it("escapes markup in text, hrefs and attributes", () => {
    const xml = buildMultistatus([
      {
        href: '/a&b<c>"d',
        propstats: [
          {
            props: [
              {
                name: davName("displayname"),
                value: xmlElements({
                  attributes: { a: '"><script>' },
                  name: davName("x"),
                  value: xmlText("<script>alert(1)</script>"),
                }),
              },
            ],
            status: 200,
          },
        ],
      },
    ]);
    assert.equal(xml.includes("<script>"), false);
    assert.ok(xml.includes('/a&amp;b&lt;c&gt;"d'));
    assert.ok(xml.includes('a="&quot;&gt;&lt;script&gt;"'));
  });

  it("round-trips address data with CRLF through a parser", () => {
    const xml = buildMultistatus([CARD_RESPONSE]);
    assert.ok(xml.includes("BEGIN:VCARD&#13;\nVERSION:3.0&#13;\n"));
    const [response] = parseXmlTree(xml).children;
    const [, propstat] = response?.children ?? [];
    const [prop] = propstat?.children ?? [];
    const addressData = prop?.children.find((node) => node.name === "address-data");
    assert.equal(addressData?.text, VCARD);
  });

  it("drops characters XML forbids", () => {
    const xml = buildMultistatus([
      {
        href: "/a",
        propstats: [
          { props: [{ name: davName("x"), value: xmlText("a\u0000b\u0008c") }], status: 200 },
        ],
      },
    ]);
    assert.ok(xml.includes("<d:x>abc</d:x>"));
  });

  it("rejects a response with both status and propstats", () => {
    assert.throws(() => buildMultistatus([{ href: "/a", propstats: [], status: 404 }]));
  });

  it("rejects an unknown status code and an unsafe element name", () => {
    assert.throws(() => buildMultistatus([{ href: "/a", status: 299 }]));
    assert.throws(() =>
      buildMultistatus([
        {
          href: "/a",
          propstats: [
            { props: [{ name: { name: "a b", ns: "DAV:" }, value: xmlEmpty }], status: 200 },
          ],
        },
      ]),
    );
  });

  it("builds an empty multistatus", () => {
    const xml = buildMultistatus([]);
    assert.ok(xml.startsWith('<?xml version="1.0" encoding="utf-8"?>\n<d:multistatus '));
    assert.ok(xml.endsWith("/>"));
  });
});

describe("buildDavError", () => {
  it("matches the golden file for valid-sync-token", () => {
    const xml = buildDavError(davName("valid-sync-token"));
    assert.equal(xml, golden("error-valid-sync-token.xml"));
  });

  it("matches the golden file for a CardDAV precondition", () => {
    const xml = buildDavError(cardName("max-resource-size"));
    assert.equal(xml, golden("error-max-resource-size.xml"));
  });

  it("emits an unknown namespace with a generated prefix", () => {
    const xml = buildDavError({ name: "boom", ns: "urn:example:x" });
    assert.ok(xml.includes('xmlns:x1="urn:example:x"'));
    assert.ok(xml.includes("<x1:boom/>"));
  });
});
