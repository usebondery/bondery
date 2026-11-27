import { DavXmlError } from "./errors.js";
import type { QName } from "./names.js";
import type { XmlNode } from "./types.js";

/** First child with this namespace and local name. */
export function childNamed(node: XmlNode, ns: string, name: string): XmlNode | undefined {
  return node.children.find((child) => child.ns === ns && child.name === name);
}

/** All children with this namespace and local name, in document order. */
export function childrenNamed(node: XmlNode, ns: string, name: string): XmlNode[] {
  return node.children.filter((child) => child.ns === ns && child.name === name);
}

/** Qualified names of all child elements, in document order. */
export function namesOfChildren(node: XmlNode): QName[] {
  return node.children.map((child) => ({ name: child.name, ns: child.ns }));
}

/** Builds the error for a well-formed body that is not a valid request. */
export function invalidRequest(message: string): DavXmlError {
  return new DavXmlError("invalid_request", message);
}
