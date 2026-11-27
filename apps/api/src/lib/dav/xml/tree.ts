import { SaxesParser } from "saxes";
import { DavXmlError } from "./errors.js";
import type { XmlNode } from "./types.js";

/** Largest request body the XML layer reads. */
const MAX_DAV_XML_BYTES = 1024 * 1024;

/** Deepest element nesting accepted. Real requests nest four or five levels. */
const MAX_DEPTH = 32;

const MAX_UTF8_BYTES_PER_UNIT = 3;

const BYTE_ORDER_MARK = 0xfe_ff;

const FORBIDDEN_DECLARATION = /<!(?:DOCTYPE|ENTITY)/i;

/** Throws `body_too_large` when the UTF-8 size of the body is over the cap. */
export function assertBodySize(body: string): void {
  // Each UTF-16 code unit is at most three UTF-8 bytes, so a short string needs no byte count.
  if (body.length * MAX_UTF8_BYTES_PER_UNIT <= MAX_DAV_XML_BYTES) {
    return;
  }
  if (Buffer.byteLength(body, "utf8") > MAX_DAV_XML_BYTES) {
    throw new DavXmlError("body_too_large", "The XML body is over the 1 MiB limit.");
  }
}

/**
 * Parses a body into a tree with resolved namespaces.
 *
 * saxes never expands custom entities and never loads external resources, and the body is refused
 * before parsing when it declares a DOCTYPE or an ENTITY. Elements carry the namespace URI, so the
 * prefix a client chose does not matter.
 */
export function parseXmlTree(input: string): XmlNode {
  assertBodySize(input);
  const body = input.charCodeAt(0) === BYTE_ORDER_MARK ? input.slice(1) : input;
  if (FORBIDDEN_DECLARATION.test(body)) {
    throw new DavXmlError(
      "forbidden_construct",
      "DOCTYPE and ENTITY declarations are not allowed.",
    );
  }

  const parser = new SaxesParser({ position: false, xmlns: true });
  const stack: XmlNode[] = [];
  const state: { root: XmlNode | null } = { root: null };

  parser.on("error", (cause) => {
    throw new DavXmlError("malformed_xml", "The XML body is not well-formed.", { cause });
  });
  parser.on("doctype", () => {
    throw new DavXmlError(
      "forbidden_construct",
      "DOCTYPE and ENTITY declarations are not allowed.",
    );
  });
  parser.on("opentag", (tag) => {
    if (stack.length >= MAX_DEPTH) {
      throw new DavXmlError("invalid_request", "The XML body nests elements too deeply.");
    }
    const attributes: Record<string, string> = Object.create(null);
    for (const attribute of Object.values(tag.attributes)) {
      if (attribute.uri === "") {
        attributes[attribute.local] = attribute.value;
      }
    }
    const node: XmlNode = { attributes, children: [], name: tag.local, ns: tag.uri, text: "" };
    stack.at(-1)?.children.push(node);
    stack.push(node);
    state.root ??= node;
  });
  parser.on("closetag", () => {
    stack.pop();
  });
  const appendText = (text: string) => {
    const current = stack.at(-1);
    if (current) {
      current.text += text;
    }
  };
  parser.on("text", appendText);
  parser.on("cdata", appendText);

  parser.write(body).close();

  if (!state.root) {
    throw new DavXmlError("malformed_xml", "The XML body has no root element.");
  }
  return state.root;
}

export { MAX_DAV_XML_BYTES };
