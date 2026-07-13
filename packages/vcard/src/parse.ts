import type { ParsedVCard, VCardParseOptions } from "#model.js";
import { unfoldLines } from "#parse/line-parsing.js";
import { parseEntity } from "#parse/normalize.js";

/**
 * Parses one or more vCard entities from a text/vcard payload.
 *
 * @param input Raw vCard text.
 * @param options Parse behavior flags.
 * @returns Parsed raw and normalized cards.
 */
export function parseVCards(input: string, options: VCardParseOptions = {}): ParsedVCard[] {
  const lines = unfoldLines(input);
  const entities: string[][] = [];
  let current: string[] | null = null;

  for (const line of lines) {
    if (line.toUpperCase() === "BEGIN:VCARD") {
      current = [line];
      continue;
    }

    if (!current) {
      continue;
    }

    current.push(line);

    if (line.toUpperCase() === "END:VCARD") {
      entities.push(current);
      current = null;
    }
  }

  if (current) {
    throw new Error("Unterminated VCARD entity.");
  }

  if (entities.length === 0) {
    throw new Error("No VCARD entities found.");
  }

  return entities.map((entity) => parseEntity(entity, options));
}

/**
 * Parses a single vCard entity from text.
 *
 * @param input Raw vCard text containing exactly one card.
 * @param options Parse behavior flags.
 * @returns Parsed raw and normalized card.
 */
export function parseVCard(input: string, options: VCardParseOptions = {}): ParsedVCard {
  const cards = parseVCards(input, options);
  if (cards.length !== 1) {
    throw new Error(`Expected exactly one VCARD entity but found ${cards.length}.`);
  }
  return cards[0];
}
