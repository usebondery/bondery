import type { VCardParameter, VCardProperty } from "#model.js";

export function unfoldLines(input: string): string[] {
  const normalized = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const physicalLines = normalized.split("\n");
  const logicalLines: string[] = [];

  for (const line of physicalLines) {
    // RFC 6350 folding: continuation line starts with space or tab
    if ((line.startsWith(" ") || line.startsWith("\t")) && logicalLines.length > 0) {
      logicalLines[logicalLines.length - 1] += line.slice(1);
      continue;
    }

    // vCard 2.1 quoted-printable soft line break: previous line ends with '='
    if (
      logicalLines.length > 0 &&
      logicalLines[logicalLines.length - 1].endsWith("=") &&
      isQuotedPrintableLine(logicalLines[logicalLines.length - 1])
    ) {
      // Remove trailing '=' and append current line
      logicalLines[logicalLines.length - 1] =
        logicalLines[logicalLines.length - 1].slice(0, -1) + line;
      continue;
    }

    if (line.length > 0) {
      logicalLines.push(line);
    }
  }

  return logicalLines;
}

/** Checks whether a content line has ENCODING=QUOTED-PRINTABLE in the property parameters. */
function isQuotedPrintableLine(line: string): boolean {
  const colonIndex = line.indexOf(":");
  if (colonIndex === -1) {
    return false;
  }
  const left = line.slice(0, colonIndex).toUpperCase();
  return left.includes("ENCODING=QUOTED-PRINTABLE");
}

/**
 * Decodes a quoted-printable encoded string to a UTF-8 string.
 * Handles multi-byte UTF-8 sequences (e.g. =C4=8D → č).
 */
function decodeQuotedPrintable(value: string): string {
  const bytes: number[] = [];
  let i = 0;
  while (i < value.length) {
    if (value[i] === "=" && i + 2 < value.length) {
      const hex = value.slice(i + 1, i + 3);
      if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
        bytes.push(parseInt(hex, 16));
        i += 3;
        continue;
      }
    }
    // Plain ASCII character
    bytes.push(value.charCodeAt(i));
    i += 1;
  }
  return new TextDecoder("utf-8").decode(new Uint8Array(bytes));
}

function findContentDelimiter(line: string): number {
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

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
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

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
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

export function parseContentLine(line: string): VCardProperty {
  const delimiterIndex = findContentDelimiter(line);
  if (delimiterIndex === -1) {
    throw new Error(`Invalid content line without value delimiter: ${line}`);
  }

  const left = line.slice(0, delimiterIndex);
  const value = line.slice(delimiterIndex + 1);
  const tokens = splitSemicolonTokens(left);
  const [nameToken, ...parameterTokens] = tokens;
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
