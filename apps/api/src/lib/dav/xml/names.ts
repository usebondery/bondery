/** Namespaces and qualified names used by WebDAV and CardDAV. */

/** A namespace URI plus a local name. Prefixes never matter. */
export interface QName {
  name: string;
  ns: string;
}

export const DAV_NS = "DAV:";
export const CARDDAV_NS = "urn:ietf:params:xml:ns:carddav";
export const CALENDARSERVER_NS = "http://calendarserver.org/ns/";

/** Builds a `DAV:` name. */
export function davName(name: string): QName {
  return { name, ns: DAV_NS };
}

/** Builds a CardDAV name. */
export function cardName(name: string): QName {
  return { name, ns: CARDDAV_NS };
}

/** Builds a calendarserver name. */
export function csName(name: string): QName {
  return { name, ns: CALENDARSERVER_NS };
}

/** True when both names have the same namespace and local name. */
export function sameQName(left: QName, right: QName): boolean {
  return left.ns === right.ns && left.name === right.name;
}
