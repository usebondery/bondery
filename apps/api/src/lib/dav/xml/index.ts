/** Pure WebDAV and CardDAV XML layer: request parsers and response builders. No I/O. */

export { buildDavError, buildMultistatus } from "./build.js";
export { DavXmlError, type DavXmlErrorCode } from "./errors.js";
export {
  CALENDARSERVER_NS,
  CARDDAV_NS,
  cardName,
  csName,
  DAV_NS,
  davName,
  type QName,
  sameQName,
} from "./names.js";
export { parsePropfind } from "./parse-propfind.js";
export { parseReport } from "./parse-report.js";
export { MAX_DAV_XML_BYTES } from "./tree.js";
export {
  type AddressDataRequest,
  type DavPropstat,
  type DavResponse,
  type PropfindRequest,
  type ReportRequest,
  type XmlElement,
  type XmlNode,
  type XmlValue,
  xmlElements,
  xmlEmpty,
  xmlEmptyElement,
  xmlText,
  xmlTextElement,
} from "./types.js";
