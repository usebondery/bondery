import { DavXmlError } from "./errors.js";
import { CARDDAV_NS, DAV_NS } from "./names.js";
import { parseXmlTree } from "./tree.js";
import { childNamed, childrenNamed, invalidRequest, namesOfChildren } from "./tree-helpers.js";
import type { AddressDataRequest, ReportRequest, XmlNode } from "./types.js";

const POSITIVE_INTEGER = /^\d+$/;

/** Reads `limit/nresults`. Both elements live in `DAV:` for sync and in the CardDAV namespace for queries. */
function readLimit(root: XmlNode, ns: string): number | null {
  const nresults = childNamed(root, ns, "limit")?.children.find(
    (child) => child.ns === ns && child.name === "nresults",
  );
  if (!nresults) {
    return null;
  }
  const text = nresults.text.trim();
  const value = Number(text);
  if (!POSITIVE_INTEGER.test(text) || !Number.isSafeInteger(value) || value < 1) {
    throw invalidRequest("nresults must be a positive integer.");
  }
  return value;
}

function optionalAddressData(prop: XmlNode | undefined): { addressData?: AddressDataRequest } {
  const node = prop ? childNamed(prop, CARDDAV_NS, "address-data") : undefined;
  if (!node) {
    return {};
  }
  const { version, "content-type": contentType } = node.attributes;
  return {
    addressData: {
      contentType: contentType ?? null,
      version: version === "3.0" || version === "4.0" ? version : null,
    },
  };
}

function parseMultiget(root: XmlNode): ReportRequest {
  const hrefs = childrenNamed(root, DAV_NS, "href").map((node) => node.text.trim());
  if (hrefs.length === 0 || hrefs.includes("")) {
    throw invalidRequest("A multiget holds one or more non-empty href elements.");
  }
  const prop = childNamed(root, DAV_NS, "prop");
  return {
    hrefs,
    kind: "addressbook-multiget",
    props: prop ? namesOfChildren(prop) : [],
    ...optionalAddressData(prop),
  };
}

function parseSyncCollection(root: XmlNode): ReportRequest {
  const level = childNamed(root, DAV_NS, "sync-level")?.text.trim() ?? "1";
  if (level !== "1") {
    throw invalidRequest("Only sync-level 1 is supported.");
  }
  const token = childNamed(root, DAV_NS, "sync-token")?.text.trim() ?? "";
  const prop = childNamed(root, DAV_NS, "prop");
  return {
    kind: "sync-collection",
    limit: readLimit(root, DAV_NS),
    props: prop ? namesOfChildren(prop) : [],
    syncLevel: "1",
    syncToken: token === "" ? null : token,
  };
}

function parseQuery(root: XmlNode): ReportRequest {
  const prop = childNamed(root, DAV_NS, "prop");
  return {
    filter: childNamed(root, CARDDAV_NS, "filter") ?? null,
    kind: "addressbook-query",
    limit: readLimit(root, CARDDAV_NS),
    props: prop ? namesOfChildren(prop) : [],
    ...optionalAddressData(prop),
  };
}

/**
 * Parses a REPORT body.
 *
 * @throws DavXmlError with code `unsupported_report` when the root is not a report we serve, and
 *   with the other codes when the body is refused or invalid.
 */
export function parseReport(body: string): ReportRequest {
  const root = parseXmlTree(body);

  if (root.ns === CARDDAV_NS && root.name === "addressbook-multiget") {
    return parseMultiget(root);
  }
  if (root.ns === DAV_NS && root.name === "sync-collection") {
    return parseSyncCollection(root);
  }
  if (root.ns === CARDDAV_NS && root.name === "addressbook-query") {
    return parseQuery(root);
  }
  throw new DavXmlError("unsupported_report", "The report is not supported.");
}
