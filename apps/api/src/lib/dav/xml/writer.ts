import { CALENDARSERVER_NS, CARDDAV_NS, DAV_NS } from "./names.js";
import type { XmlElement } from "./types.js";

const XML_DECLARATION = '<?xml version="1.0" encoding="utf-8"?>';

/** Prefixes every document declares on its root. Other namespaces get `x1`, `x2`, ... */
const FIXED_PREFIXES: ReadonlyMap<string, string> = new Map([
  [DAV_NS, "d"],
  [CARDDAV_NS, "card"],
  [CALENDARSERVER_NS, "cs"],
]);

/** Local names must not hold characters that would break out of a tag. */
const UNSAFE_NAME = /[\s<>&"'/=:!?]/u;

// Characters XML 1.0 forbids. A vCard cannot carry them, and one stray byte would make the whole
// multistatus unparsable for the client, so they are dropped.
// The class is built from code points so that no raw control character sits in the source.
const chr = String.fromCharCode;
const INVALID_XML_CHARS = new RegExp(
  `[${chr(0x0)}-${chr(0x8)}${chr(0xb)}${chr(0xc)}${chr(0xe)}-${chr(0x1f)}${chr(0xff_fe)}${chr(0xff_ff)}]`,
  "g",
);

/** Escapes text content. `\r` becomes `&#13;` because parsers fold a literal CRLF into LF. */
function escapeText(value: string): string {
  return value
    .replace(INVALID_XML_CHARS, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\r/g, "&#13;");
}

/** Escapes an attribute value. */
function escapeAttribute(value: string): string {
  return escapeText(value).replace(/"/g, "&quot;").replace(/\t/g, "&#9;").replace(/\n/g, "&#10;");
}

function assertSafeName(name: string): void {
  if (name === "" || UNSAFE_NAME.test(name)) {
    throw new Error("Invalid XML name.");
  }
}

/** Assigns a prefix to every namespace in the tree, in order of first appearance. */
function collectPrefixes(root: XmlElement): Map<string, string> {
  const prefixes = new Map(FIXED_PREFIXES);
  let extra = 0;
  const visit = (element: XmlElement) => {
    if (!prefixes.has(element.name.ns)) {
      extra += 1;
      prefixes.set(element.name.ns, `x${extra}`);
    }
    if (element.value.kind === "elements") {
      for (const child of element.value.elements) {
        visit(child);
      }
    }
  };
  visit(root);
  return prefixes;
}

function writeElement(
  element: XmlElement,
  prefixes: Map<string, string>,
  depth: number,
  declarations: string,
  lines: string[],
): void {
  assertSafeName(element.name.name);
  const prefix = prefixes.get(element.name.ns);
  const tag = `${prefix}:${element.name.name}`;
  let attributes = declarations;
  for (const [name, value] of Object.entries(element.attributes ?? {})) {
    assertSafeName(name);
    attributes += ` ${name}="${escapeAttribute(value)}"`;
  }
  const indent = "  ".repeat(depth);
  const { value } = element;

  if (value.kind === "empty" || (value.kind === "text" && value.text === "")) {
    lines.push(`${indent}<${tag}${attributes}/>`);
  } else if (value.kind === "text") {
    lines.push(`${indent}<${tag}${attributes}>${escapeText(value.text)}</${tag}>`);
  } else if (value.elements.length === 0) {
    lines.push(`${indent}<${tag}${attributes}/>`);
  } else {
    lines.push(`${indent}<${tag}${attributes}>`);
    for (const child of value.elements) {
      writeElement(child, prefixes, depth + 1, "", lines);
    }
    lines.push(`${indent}</${tag}>`);
  }
}

/**
 * Serializes a tree to a document. The output is deterministic: fixed prefixes, namespace
 * declarations on the root, two-space indentation, no trailing newline.
 */
export function writeDocument(root: XmlElement): string {
  const prefixes = collectPrefixes(root);
  const declarations = [...prefixes]
    .map(([ns, prefix]) => ` xmlns:${prefix}="${escapeAttribute(ns)}"`)
    .join("");
  const lines = [XML_DECLARATION];
  writeElement(root, prefixes, 0, declarations, lines);
  return lines.join("\n");
}
