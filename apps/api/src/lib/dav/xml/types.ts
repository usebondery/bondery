import type { QName } from "./names.js";

/** A parsed element, kept as a plain tree. Used for the `addressbook-query` filter. */
export interface XmlNode {
  /** Unprefixed attributes by local name. Namespaced attributes and `xmlns` declarations are dropped. */
  attributes: Record<string, string | undefined>;
  children: XmlNode[];
  name: string;
  ns: string;
  /** Text and CDATA directly inside this element, in document order. */
  text: string;
}

/** What the client asked for in `address-data`. */
export interface AddressDataRequest {
  /** `content-type` attribute as sent, or `null` when absent. */
  contentType: string | null;
  /** vCard version the client asked for, or `null` when absent or not 3.0 or 4.0. */
  version: "3.0" | "4.0" | null;
}

export type PropfindRequest =
  | { kind: "allprop"; include: QName[] }
  | { kind: "propname" }
  | { kind: "prop"; props: QName[] };

export type ReportRequest =
  | {
      kind: "addressbook-multiget";
      /** `href` values in document order, trimmed, not decoded. */
      hrefs: string[];
      props: QName[];
      addressData?: AddressDataRequest;
    }
  | {
      kind: "sync-collection";
      /** `null` for an initial sync (no `sync-token` element or an empty one). */
      syncToken: string | null;
      syncLevel: "1";
      limit: number | null;
      props: QName[];
    }
  | {
      kind: "addressbook-query";
      props: QName[];
      /** The `card:filter` element as a tree, or `null` when the client sent none. */
      filter: XmlNode | null;
      limit: number | null;
      addressData?: AddressDataRequest;
    };

/** Value of one property in a response. */
export type XmlValue =
  | { kind: "empty" }
  | { kind: "text"; text: string }
  | { kind: "elements"; elements: XmlElement[] };

export interface XmlElement {
  /** Unprefixed attributes. Written in insertion order. */
  attributes?: Record<string, string>;
  name: QName;
  value: XmlValue;
}

export interface DavPropstat {
  props: { name: QName; value: XmlValue }[];
  status: number;
}

/**
 * One `response` in a multistatus. Give `propstats` or `status`, not both. A bare `status` answers
 * for the whole resource (for example 404 for a missing multiget href).
 */
export interface DavResponse {
  href: string;
  propstats?: DavPropstat[];
  status?: number;
}

/** An empty element, for example `<d:collection/>`. */
export const xmlEmpty: XmlValue = { kind: "empty" };

/** A text value. The writer escapes it. */
export function xmlText(text: string): XmlValue {
  return { kind: "text", text };
}

/** A list of child elements. */
export function xmlElements(...elements: XmlElement[]): XmlValue {
  return { elements, kind: "elements" };
}

/** An element with no content, for example `<d:collection/>`. */
export function xmlEmptyElement(name: QName): XmlElement {
  return { name, value: xmlEmpty };
}

/** An element holding text. */
export function xmlTextElement(
  name: QName,
  text: string,
  attributes?: Record<string, string>,
): XmlElement {
  return { attributes, name, value: xmlText(text) };
}
