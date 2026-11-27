import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DavXmlError } from "./errors.js";
import { CALENDARSERVER_NS, CARDDAV_NS, DAV_NS } from "./names.js";
import { parsePropfind } from "./parse-propfind.js";

const dav = (name: string) => ({ name, ns: DAV_NS });
const card = (name: string) => ({ name, ns: CARDDAV_NS });
const cs = (name: string) => ({ name, ns: CALENDARSERVER_NS });

/** macOS Contacts: discovery on the root with prefix `A:`. */
const MACOS_PRINCIPAL = `<?xml version="1.0" encoding="UTF-8"?>
<A:propfind xmlns:A="DAV:">
  <A:prop>
    <A:current-user-principal/>
    <A:principal-URL/>
    <A:resourcetype/>
  </A:prop>
</A:propfind>`;

/** iOS: home set lookup, CardDAV prefix `B:`. */
const IOS_HOME_SET = `<?xml version="1.0" encoding="UTF-8"?>
<A:propfind xmlns:A="DAV:" xmlns:B="urn:ietf:params:xml:ns:carddav">
  <A:prop>
    <B:addressbook-home-set/>
    <A:displayname/>
  </A:prop>
</A:propfind>`;

/** DAVx5: address-book properties. The prefixes are parameters so a test can swap them. */
function davx5AddressBook(d: string, c: string, srv: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<${d}:propfind xmlns:${d}="DAV:" xmlns:${c}="urn:ietf:params:xml:ns:carddav" xmlns:${srv}="http://calendarserver.org/ns/">
  <${d}:prop>
    <${d}:resourcetype/>
    <${d}:displayname/>
    <${c}:addressbook-description/>
    <${d}:current-user-privilege-set/>
    <${srv}:getctag/>
    <${d}:sync-token/>
    <${d}:supported-report-set/>
    <${c}:supported-address-data/>
  </${d}:prop>
</${d}:propfind>`;
}

const DAVX5_ADDRESS_BOOK = davx5AddressBook("d", "card", "cs");

/** Thunderbird: `DAV:` as the default namespace, other namespaces on short prefixes. */
const THUNDERBIRD_HOME_SET = `<?xml version="1.0"?>
<propfind xmlns="DAV:" xmlns:c="urn:ietf:params:xml:ns:carddav">
  <prop>
    <c:addressbook-home-set/>
    <current-user-principal/>
  </prop>
</propfind>`;

describe("parsePropfind", () => {
  it("treats an empty body as allprop", () => {
    assert.deepEqual(parsePropfind(""), { include: [], kind: "allprop" });
    assert.deepEqual(parsePropfind("  \r\n "), { include: [], kind: "allprop" });
  });

  it("reads the macOS principal discovery request", () => {
    assert.deepEqual(parsePropfind(MACOS_PRINCIPAL), {
      kind: "prop",
      props: [dav("current-user-principal"), dav("principal-URL"), dav("resourcetype")],
    });
  });

  it("reads the iOS home set request", () => {
    assert.deepEqual(parsePropfind(IOS_HOME_SET), {
      kind: "prop",
      props: [card("addressbook-home-set"), dav("displayname")],
    });
  });

  it("reads the DAVx5 address-book request with every namespace", () => {
    assert.deepEqual(parsePropfind(DAVX5_ADDRESS_BOOK), {
      kind: "prop",
      props: [
        dav("resourcetype"),
        dav("displayname"),
        card("addressbook-description"),
        dav("current-user-privilege-set"),
        cs("getctag"),
        dav("sync-token"),
        dav("supported-report-set"),
        card("supported-address-data"),
      ],
    });
  });

  it("reads the Thunderbird request that uses a default namespace", () => {
    assert.deepEqual(parsePropfind(THUNDERBIRD_HOME_SET), {
      kind: "prop",
      props: [card("addressbook-home-set"), dav("current-user-principal")],
    });
  });

  it("gives the same result for any prefix", () => {
    const renamed = davx5AddressBook("zz", "q", "srv");
    assert.deepEqual(parsePropfind(renamed), parsePropfind(DAVX5_ADDRESS_BOOK));
  });

  it("does not match an element by prefix when the namespace differs", () => {
    const body = `<d:propfind xmlns:d="DAV:" xmlns:x="urn:other"><d:prop><x:getctag/></d:prop></d:propfind>`;
    assert.deepEqual(parsePropfind(body), {
      kind: "prop",
      props: [{ name: "getctag", ns: "urn:other" }],
    });
  });

  it("reads propname", () => {
    assert.deepEqual(parsePropfind(`<D:propfind xmlns:D="DAV:"><D:propname/></D:propfind>`), {
      kind: "propname",
    });
  });

  it("reads allprop with include", () => {
    const body = `<D:propfind xmlns:D="DAV:" xmlns:cs="http://calendarserver.org/ns/">
      <D:allprop/>
      <D:include><cs:getctag/><D:sync-token/></D:include>
    </D:propfind>`;
    assert.deepEqual(parsePropfind(body), {
      include: [cs("getctag"), dav("sync-token")],
      kind: "allprop",
    });
  });

  it("rejects a document that is not a propfind", () => {
    assert.throws(
      () => parsePropfind(`<D:other xmlns:D="DAV:"/>`),
      (error) => error instanceof DavXmlError && error.code === "invalid_request",
    );
  });

  it("rejects a propfind in another namespace", () => {
    assert.throws(
      () => parsePropfind(`<propfind xmlns="urn:other"><prop/></propfind>`),
      (error) => error instanceof DavXmlError && error.code === "invalid_request",
    );
  });

  it("rejects a propfind with no prop, allprop or propname", () => {
    assert.throws(
      () => parsePropfind(`<D:propfind xmlns:D="DAV:"/>`),
      (error) => error instanceof DavXmlError && error.code === "invalid_request",
    );
  });

  it("rejects a propfind that mixes prop and allprop", () => {
    assert.throws(
      () => parsePropfind(`<D:propfind xmlns:D="DAV:"><D:prop/><D:allprop/></D:propfind>`),
      (error) => error instanceof DavXmlError && error.code === "invalid_request",
    );
  });
});
