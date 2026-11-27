import type { VCardParameter, VCardProperty } from "#model.js";

/** Longest content line in octets, excluding CRLF (RFC 2426 section 2.6). */
const FOLD_LIMIT_OCTETS = 75;

const UTF8_ONE_BYTE_MAX = 0x7f;
const UTF8_TWO_BYTE_MAX = 0x7_ff;
const UTF8_THREE_BYTE_MAX = 0xff_ff;

const NEWLINE_RE = /\r\n|\r|\n/g;
const BACKSLASH_RE = /\\/g;
const COMMA_RE = /,/g;
const SEMICOLON_RE = /;/g;
const PARAMETER_QUOTE_RE = /[:,;]|^\s|\s$/;

function utf8Length(character: string) {
  const codePoint = character.codePointAt(0) ?? 0;
  if (codePoint <= UTF8_ONE_BYTE_MAX) {
    return 1;
  }
  if (codePoint <= UTF8_TWO_BYTE_MAX) {
    return 2;
  }
  return codePoint <= UTF8_THREE_BYTE_MAX ? 3 : 4;
}

function encodeParameterValue(value: string): string {
  return PARAMETER_QUOTE_RE.test(value) ? `"${value}"` : value;
}

function serializeParameters(parameters: VCardParameter[]): string {
  return parameters
    .map(
      (parameter) =>
        `;${parameter.name.toUpperCase()}=${parameter.values.map(encodeParameterValue).join(",")}`,
    )
    .join("");
}

/**
 * Folds one content line at 75 octets. A continuation line starts with one space, so its text
 * holds at most 74 octets. Never splits a UTF-8 code point.
 *
 * @param line Unfolded content line.
 * @returns Physical lines without line terminators.
 */
function foldContentLine(line: string): string[] {
  const physicalLines: string[] = [];
  let current = "";
  let currentOctets = 0;
  let limit = FOLD_LIMIT_OCTETS;

  for (const character of line) {
    const octets = utf8Length(character);
    if (currentOctets + octets > limit) {
      physicalLines.push(physicalLines.length === 0 ? current : ` ${current}`);
      current = "";
      currentOctets = 0;
      limit = FOLD_LIMIT_OCTETS - 1;
    }
    current += character;
    currentOctets += octets;
  }

  if (current || physicalLines.length === 0) {
    physicalLines.push(physicalLines.length === 0 ? current : ` ${current}`);
  }
  return physicalLines;
}

/** Replaces every line break with LF so a value cannot end its content line early. */
function normalizeNewlines(value: string): string {
  return value.replace(NEWLINE_RE, "\n");
}

/** Escapes a text value per RFC 2426: backslash, line break, comma and semicolon. */
function escapeVCardText(value: string): string {
  return normalizeNewlines(value)
    .replace(BACKSLASH_RE, "\\\\")
    .replace(NEWLINE_RE, "\\n")
    .replace(COMMA_RE, "\\,")
    .replace(SEMICOLON_RE, "\\;");
}

/** Builds the unfolded content line of a property, with group and parameters. */
function buildContentLine(property: VCardProperty): string {
  const group = property.group ? `${property.group}.` : "";
  return `${group}${property.name.toUpperCase()}${serializeParameters(property.parameters)}:${property.value}`;
}

/**
 * Decodes an RFC 2426 text value in one pass. A pass that handles each escape on its own would
 * decode the text `\\n` (an escaped backslash, then `n`) as a backslash and a line break.
 *
 * @param value Escaped text from a content line.
 * @returns Plain text.
 */
function unescapeVCardText(value: string): string {
  let result = "";
  for (let index = 0; index < value.length; index += 1) {
    const character = value.charAt(index);
    const next = value.charAt(index + 1);
    if (character !== "\\" || next === "") {
      result += character;
      continue;
    }
    index += 1;
    if (next === "n" || next === "N") {
      result += "\n";
    } else if (next === "," || next === ";" || next === "\\" || next === ":") {
      result += next;
    } else {
      result += `\\${next}`;
    }
  }
  return result;
}

/**
 * Splits on a separator that is not escaped by a backslash. Escapes stay in the parts, so call
 * {@link unescapeVCardText} on each part.
 *
 * @param value Escaped structured value.
 * @param separator One character, for example `;` or `,`.
 * @returns The parts, including empty ones.
 */
function splitUnescaped(value: string, separator: string): string[] {
  const parts: string[] = [];
  let current = "";
  for (let index = 0; index < value.length; index += 1) {
    const character = value.charAt(index);
    if (character === "\\" && index + 1 < value.length) {
      current += character + value.charAt(index + 1);
      index += 1;
      continue;
    }
    if (character === separator) {
      parts.push(current);
      current = "";
      continue;
    }
    current += character;
  }
  parts.push(current);
  return parts;
}

export {
  buildContentLine,
  escapeVCardText,
  foldContentLine,
  normalizeNewlines,
  splitUnescaped,
  unescapeVCardText,
};
