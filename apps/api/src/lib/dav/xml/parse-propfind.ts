import { DAV_NS } from "./names.js";
import { assertBodySize, parseXmlTree } from "./tree.js";
import { childNamed, invalidRequest, namesOfChildren } from "./tree-helpers.js";
import type { PropfindRequest } from "./types.js";

/**
 * Parses a PROPFIND body. An empty body means `allprop` (RFC 4918, section 9.1).
 *
 * @throws DavXmlError when the body is refused or is not a valid `propfind` document.
 */
export function parsePropfind(body: string): PropfindRequest {
  assertBodySize(body);
  if (body.trim() === "") {
    return { include: [], kind: "allprop" };
  }

  const root = parseXmlTree(body);
  if (root.ns !== DAV_NS || root.name !== "propfind") {
    throw invalidRequest("The body is not a DAV:propfind document.");
  }

  const prop = childNamed(root, DAV_NS, "prop");
  const allprop = childNamed(root, DAV_NS, "allprop");
  const propname = childNamed(root, DAV_NS, "propname");
  const present = [prop, allprop, propname].filter((node) => node !== undefined);
  if (present.length !== 1) {
    throw invalidRequest("A propfind holds exactly one of prop, allprop and propname.");
  }

  if (prop) {
    return { kind: "prop", props: namesOfChildren(prop) };
  }
  if (allprop) {
    const include = childNamed(root, DAV_NS, "include");
    return { include: include ? namesOfChildren(include) : [], kind: "allprop" };
  }
  return { kind: "propname" };
}
