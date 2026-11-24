import type { VCardParameter, VCardProperty } from "#model.js";

const FA_RE = /^[0-9A-Fa-f]{2}$/;

/** Checks whether a content line has ENCODING=QUOTED-PRINTABLE in the property parameters. */
function isQuotedPrintableLine(line: string): boolean {
  const colonIndex = line.indexOf(":");
  if (colonIndex === -1) {
    return false;
  }
  const left = line.slice(0, colonIndex).toUpperCase();
  return left.includes("ENCODING=QUOTED-PRINTABLE");
}

/** A quoted-printable escape is `=` followed by two hex digits, as in `=C4`. */
const QUOTED_PRINTABLE_ESCAPE_LENGTH = 3;

/**
 * Decodes a quoted-printable encoded string to a UTF-8 string.
 * Handles multi-byte UTF-8 sequences (e.g. =C4=8D → č).
 */
function decodeQuotedPrintable(value: string): string {
  const bytes: number[] = [];
  let i = 0;
  while (i < value.length) {
    if (value[i] === "=" && i + 2 < value.length) {
      const hex = value.slice(i + 1, i + QUOTED_PRINTABLE_ESCAPE_LENGTH);
      if (FA_RE.test(hex)) {
        bytes.push(Number.parseInt(hex, 16));
        i += QUOTED_PRINTABLE_ESCAPE_LENGTH;
        continue;
      }
    }
    // Plain ASCII character
    bytes.push(value.charCodeAt(i));
    i += 1;
  }
  return new TextDecoder("utf-8").decode(new Uint8Array(bytes));
}

function findContentDelimiter(line: string) {
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      quoted = !quoted;
    }
    if (char === ":" && !quoted) {
      return index;
    }
  }

  return -1;
}

function splitSemicolonTokens(value: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quoted = false;

  for (const char of value) {
    if (char === '"') {
      quoted = !quoted;
      current += char;
      continue;
    }

    if (char === ";" && !quoted) {
      tokens.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  tokens.push(current);
  return tokens;
}

function splitCommaTokens(value: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quoted = false;

  for (const char of value) {
    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      tokens.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  tokens.push(current);
  return tokens;
}

function parseParameters(tokens: string[]): VCardParameter[] {
  const parameters: VCardParameter[] = [];

  for (const token of tokens) {
    if (!token) {
      continue;
    }

    const equalsIndex = token.indexOf("=");
    if (equalsIndex === -1) {
      parameters.push({ name: "TYPE", values: [token.toLowerCase()] });
      continue;
    }

    const name = token.slice(0, equalsIndex).trim().toUpperCase();
    const rawValue = token.slice(equalsIndex + 1).trim();
    const values = splitCommaTokens(rawValue).map((value) => value.replace(/^"|"$/g, ""));
    parameters.push({ name, values });
  }

  return parameters;
}

export function unfoldLines(input: string): string[] {
  const normalized = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const physicalLines = normalized.split("\n");
  const logicalLines: string[] = [];

  for (const line of physicalLines) {
    const previous = logicalLines.at(-1);

    // RFC 6350 folding: continuation line starts with space or tab
    if (previous !== undefined && (line.startsWith(" ") || line.startsWith("\t"))) {
      logicalLines.pop();
      logicalLines.push(previous + line.slice(1));
      continue;
    }

    // vCard 2.1 quoted-printable soft line break: previous line ends with '='
    if (previous !== undefined && previous.endsWith("=") && isQuotedPrintableLine(previous)) {
      // Remove trailing '=' and append current line
      logicalLines.pop();
      logicalLines.push(previous.slice(0, -1) + line);
      continue;
    }

    if (line.length > 0) {
      logicalLines.push(line);
    }
  }

  return logicalLines;
}

export function parseContentLine(line: string): VCardProperty {
  const delimiterIndex = findContentDelimiter(line);
  if (delimiterIndex === -1) {
    throw new Error(`Invalid content line without value delimiter: ${line}`);
  }

  const left = line.slice(0, delimiterIndex);
  const value = line.slice(delimiterIndex + 1);
  const tokens = splitSemicolonTokens(left);
  // splitSemicolonTokens always returns at least one token, so the default never applies.
  const [nameToken = "", ...parameterTokens] = tokens;
  const groupSeparatorIndex = nameToken.indexOf(".");

  const group = groupSeparatorIndex === -1 ? undefined : nameToken.slice(0, groupSeparatorIndex);
  const name = (groupSeparatorIndex === -1 ? nameToken : nameToken.slice(groupSeparatorIndex + 1))
    .trim()
    .toUpperCase();

  const parameters = parseParameters(parameterTokens);

  // Decode quoted-printable value when the encoding parameter is present (vCard 2.1/3.0)
  const encoding = parameters.find((p) => p.name === "ENCODING")?.values[0]?.toLowerCase();
  const decodedValue = encoding === "quoted-printable" ? decodeQuotedPrintable(value) : value;

  return {
    group,
    name,
    parameters,
    value: decodedValue,
  };
}
