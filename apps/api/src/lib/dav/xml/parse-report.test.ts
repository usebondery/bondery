import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DavXmlError } from "./errors.js";
import { CARDDAV_NS, DAV_NS } from "./names.js";
import { parseReport } from "./parse-report.js";

const dav = (name: string) => ({ name, ns: DAV_NS });
const card = (name: string) => ({ name, ns: CARDDAV_NS });

/** iOS and macOS: multiget with three hrefs and a versioned address-data. */
const IOS_MULTIGET = `<?xml version="1.0" encoding="UTF-8"?>
<B:addressbook-multiget xmlns:A="DAV:" xmlns:B="urn:ietf:params:xml:ns:carddav">
  <A:prop>
    <A:getetag/>
    <B:address-data content-type="text/vcard" version="3.0"/>
  </A:prop>
  <A:href>/dav/addressbooks/u1/bondery/019a.vcf</A:href>
  <A:href>/dav/addressbooks/u1/bondery/019b.vcf</A:href>
  <A:href>/dav/addressbooks/u1/bondery/019c%20x.vcf</A:href>
</B:addressbook-multiget>`;

/** DAVx5: multiget with `card:` and `d:` prefixes and a bare address-data. */
const DAVX5_MULTIGET = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<card:addressbook-multiget xmlns:card="urn:ietf:params:xml:ns:carddav" xmlns:d="DAV:">
  <d:prop><d:getcontenttype/><d:getetag/><card:address-data/></d:prop>
  <d:href>/dav/addressbooks/u1/bondery/a.vcf</d:href>
  <d:href>/dav/addressbooks/u1/bondery/b.vcf</d:href>
  <d:href>/dav/addressbooks/u1/bondery/c.vcf</d:href>
</card:addressbook-multiget>`;

/** Thunderbird: default namespace is CardDAV, `DAV:` has a prefix. */
const THUNDERBIRD_MULTIGET = `<addressbook-multiget xmlns="urn:ietf:params:xml:ns:carddav" xmlns:D="DAV:">
  <D:prop><D:getetag/><address-data/></D:prop>
  <D:href>/dav/addressbooks/u1/bondery/x.vcf</D:href>
</addressbook-multiget>`;

const SYNC_INITIAL = `<?xml version="1.0" encoding="UTF-8"?>
<d:sync-collection xmlns:d="DAV:">
  <d:sync-token/>
  <d:sync-level>1</d:sync-level>
  <d:prop><d:getetag/></d:prop>
</d:sync-collection>`;

const SYNC_WITH_TOKEN = `<?xml version="1.0" encoding="UTF-8"?>
<D:sync-collection xmlns:D="DAV:">
  <D:sync-token>https://usebondery.com/ns/sync/g1-42</D:sync-token>
  <D:sync-level>1</D:sync-level>
  <D:limit><D:nresults>100</D:nresults></D:limit>
  <D:prop><D:getetag/><D:getcontenttype/></D:prop>
</D:sync-collection>`;

describe("parseReport: addressbook-multiget", () => {
  it("reads hrefs in document order, props and address-data attributes", () => {
    assert.deepEqual(parseReport(IOS_MULTIGET), {
      addressData: { contentType: "text/vcard", version: "3.0" },
      hrefs: [
        "/dav/addressbooks/u1/bondery/019a.vcf",
        "/dav/addressbooks/u1/bondery/019b.vcf",
        "/dav/addressbooks/u1/bondery/019c%20x.vcf",
      ],
      kind: "addressbook-multiget",
      props: [dav("getetag"), card("address-data")],
    });
  });

  it("reads DAVx5 multiget with a bare address-data", () => {
    assert.deepEqual(parseReport(DAVX5_MULTIGET), {
      addressData: { contentType: null, version: null },
      hrefs: [
        "/dav/addressbooks/u1/bondery/a.vcf",
        "/dav/addressbooks/u1/bondery/b.vcf",
        "/dav/addressbooks/u1/bondery/c.vcf",
      ],
      kind: "addressbook-multiget",
      props: [dav("getcontenttype"), dav("getetag"), card("address-data")],
    });
  });

  it("reads Thunderbird multiget with a default CardDAV namespace", () => {
    assert.deepEqual(parseReport(THUNDERBIRD_MULTIGET), {
      addressData: { contentType: null, version: null },
      hrefs: ["/dav/addressbooks/u1/bondery/x.vcf"],
      kind: "addressbook-multiget",
      props: [dav("getetag"), card("address-data")],
    });
  });

  it("omits addressData when the client does not ask for it", () => {
    const body = `<C:addressbook-multiget xmlns:C="urn:ietf:params:xml:ns:carddav" xmlns:D="DAV:">
      <D:prop><D:getetag/></D:prop><D:href>/a.vcf</D:href></C:addressbook-multiget>`;
    const report = parseReport(body);
    assert.equal("addressData" in report, false);
  });

  it("maps an unknown address-data version to null", () => {
    const body = `<C:addressbook-multiget xmlns:C="urn:ietf:params:xml:ns:carddav" xmlns:D="DAV:">
      <D:prop><C:address-data version="2.1"/></D:prop><D:href>/a.vcf</D:href></C:addressbook-multiget>`;
    const report = parseReport(body);
    assert.equal(report.kind === "addressbook-multiget" && report.addressData?.version, null);
  });

  it("rejects a multiget without hrefs", () => {
    const body = `<C:addressbook-multiget xmlns:C="urn:ietf:params:xml:ns:carddav" xmlns:D="DAV:"><D:prop/></C:addressbook-multiget>`;
    assert.throws(
      () => parseReport(body),
      (error) => error instanceof DavXmlError && error.code === "invalid_request",
    );
  });

  it("rejects an empty href", () => {
    const body = `<C:addressbook-multiget xmlns:C="urn:ietf:params:xml:ns:carddav" xmlns:D="DAV:"><D:href> </D:href></C:addressbook-multiget>`;
    assert.throws(
      () => parseReport(body),
      (error) => error instanceof DavXmlError && error.code === "invalid_request",
    );
  });
});

describe("parseReport: sync-collection", () => {
  it("reads an initial sync with an empty token", () => {
    assert.deepEqual(parseReport(SYNC_INITIAL), {
      kind: "sync-collection",
      limit: null,
      props: [dav("getetag")],
      syncLevel: "1",
      syncToken: null,
    });
  });

  it("reads a sync with a token and a limit", () => {
    assert.deepEqual(parseReport(SYNC_WITH_TOKEN), {
      kind: "sync-collection",
      limit: 100,
      props: [dav("getetag"), dav("getcontenttype")],
      syncLevel: "1",
      syncToken: "https://usebondery.com/ns/sync/g1-42",
    });
  });

  it("treats a missing sync-token element as an initial sync", () => {
    const body = `<D:sync-collection xmlns:D="DAV:"><D:sync-level>1</D:sync-level><D:prop/></D:sync-collection>`;
    const report = parseReport(body);
    assert.equal(report.kind === "sync-collection" && report.syncToken, null);
  });

  it("rejects sync-level infinite", () => {
    const body = `<D:sync-collection xmlns:D="DAV:"><D:sync-token/><D:sync-level>infinite</D:sync-level></D:sync-collection>`;
    assert.throws(
      () => parseReport(body),
      (error) => error instanceof DavXmlError && error.code === "invalid_request",
    );
  });

  it("rejects a bad nresults", () => {
    for (const value of ["0", "-1", "abc", "1.5", ""]) {
      const body = `<D:sync-collection xmlns:D="DAV:"><D:sync-token/><D:sync-level>1</D:sync-level><D:limit><D:nresults>${value}</D:nresults></D:limit></D:sync-collection>`;
      assert.throws(
        () => parseReport(body),
        (error) => error instanceof DavXmlError && error.code === "invalid_request",
        `nresults "${value}"`,
      );
    }
  });
});

describe("parseReport: addressbook-query", () => {
  const QUERY = `<?xml version="1.0" encoding="UTF-8"?>
<C:addressbook-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:carddav">
  <D:prop><D:getetag/><C:address-data><C:prop name="FN"/></C:address-data></D:prop>
  <C:filter test="anyof">
    <C:prop-filter name="FN">
      <C:text-match collation="i;unicode-casemap" match-type="contains">anna</C:text-match>
    </C:prop-filter>
  </C:filter>
  <C:limit><C:nresults>50</C:nresults></C:limit>
</C:addressbook-query>`;

  it("keeps the filter as a tree and reads the limit", () => {
    const report = parseReport(QUERY);
    assert.equal(report.kind, "addressbook-query");
    if (report.kind !== "addressbook-query") {
      return;
    }
    assert.equal(report.limit, 50);
    assert.deepEqual(report.props, [dav("getetag"), card("address-data")]);
    assert.equal(report.filter?.ns, CARDDAV_NS);
    assert.equal(report.filter?.name, "filter");
    assert.equal(report.filter?.attributes.test, "anyof");
    const textMatch = report.filter?.children[0]?.children[0];
    assert.equal(textMatch?.name, "text-match");
    assert.equal(textMatch?.text, "anna");
    assert.equal(textMatch?.attributes["match-type"], "contains");
  });

  it("returns a null filter and limit when the client sends none", () => {
    const body = `<C:addressbook-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:carddav"><D:prop><D:getetag/></D:prop></C:addressbook-query>`;
    const report = parseReport(body);
    assert.equal(report.kind === "addressbook-query" && report.filter, null);
    assert.equal(report.kind === "addressbook-query" && report.limit, null);
  });
});

describe("parseReport: unsupported", () => {
  it("throws unsupported_report for an unknown report", () => {
    assert.throws(
      () => parseReport(`<C:free-busy-query xmlns:C="urn:ietf:params:xml:ns:caldav"/>`),
      (error) => error instanceof DavXmlError && error.code === "unsupported_report",
    );
  });

  it("throws unsupported_report for a known name in the wrong namespace", () => {
    assert.throws(
      () => parseReport(`<sync-collection xmlns="urn:other"/>`),
      (error) => error instanceof DavXmlError && error.code === "unsupported_report",
    );
  });
});
