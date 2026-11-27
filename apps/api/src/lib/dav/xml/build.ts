import { davName, type QName } from "./names.js";
import {
  type DavPropstat,
  type DavResponse,
  type XmlElement,
  xmlElements,
  xmlEmptyElement,
  xmlTextElement,
} from "./types.js";
import { writeDocument } from "./writer.js";

const REASON_PHRASES: Readonly<Record<number, string>> = {
  200: "OK",
  201: "Created",
  204: "No Content",
  400: "Bad Request",
  403: "Forbidden",
  404: "Not Found",
  409: "Conflict",
  412: "Precondition Failed",
  415: "Unsupported Media Type",
  424: "Failed Dependency",
  500: "Internal Server Error",
  507: "Insufficient Storage",
};

/** `HTTP/1.1 <code> <reason>` as WebDAV writes it in `status` elements. */
function statusLine(code: number): string {
  const reason = REASON_PHRASES[code];
  if (reason === undefined) {
    throw new Error(`No reason phrase for HTTP status ${code}.`);
  }
  return `HTTP/1.1 ${code} ${reason}`;
}

/** Merges propstats that share a status, keeping the order of first appearance. Drops empty ones. */
function groupByStatus(propstats: DavPropstat[]): DavPropstat[] {
  const grouped = new Map<number, DavPropstat["props"]>();
  for (const propstat of propstats) {
    const props = grouped.get(propstat.status) ?? [];
    props.push(...propstat.props);
    grouped.set(propstat.status, props);
  }
  return [...grouped]
    .filter(([, props]) => props.length > 0)
    .map(([status, props]) => ({ props, status }));
}

function responseElement(response: DavResponse): XmlElement {
  const { propstats, status } = response;
  if (propstats !== undefined && status !== undefined) {
    throw new Error("A response holds propstats or a status, not both.");
  }
  const children: XmlElement[] = [xmlTextElement(davName("href"), response.href)];
  if (status !== undefined) {
    children.push(xmlTextElement(davName("status"), statusLine(status)));
  }
  for (const propstat of groupByStatus(propstats ?? [])) {
    children.push({
      name: davName("propstat"),
      value: xmlElements(
        {
          name: davName("prop"),
          value: xmlElements(...propstat.props.map(({ name, value }) => ({ name, value }))),
        },
        xmlTextElement(davName("status"), statusLine(propstat.status)),
      ),
    });
  }
  return { name: davName("response"), value: xmlElements(...children) };
}

/**
 * Builds a 207 Multi-Status body. Every text value is escaped. `opts.syncToken` adds the
 * top-level `sync-token` that `sync-collection` answers carry.
 */
export function buildMultistatus(responses: DavResponse[], opts?: { syncToken?: string }): string {
  const children = responses.map(responseElement);
  if (opts?.syncToken !== undefined) {
    children.push(xmlTextElement(davName("sync-token"), opts.syncToken));
  }
  return writeDocument({ name: davName("multistatus"), value: xmlElements(...children) });
}

/** Builds an `error` body that names one precondition or postcondition element. */
export function buildDavError(precondition: QName): string {
  return writeDocument({
    name: davName("error"),
    value: xmlElements(xmlEmptyElement(precondition)),
  });
}
