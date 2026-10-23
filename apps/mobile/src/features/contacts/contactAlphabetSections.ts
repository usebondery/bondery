import { formatContactName } from "@bondery/helpers/contact";
import type { Contact } from "@bondery/schemas";
import type { ContactSection } from "./contactsFlatList";

const UNICODE_LETTER = /^\p{L}$/u;

export function getContactSectionLetter(contact: Contact, locale: string): string {
  const name = formatContactName(contact).normalize("NFC");
  const initial = [...name][0]?.toLocaleUpperCase(locale) ?? "";

  if (!UNICODE_LETTER.test(initial)) {
    return "#";
  }

  return initial;
}

export function compareByLocale(left: string, right: string, locale: string): number {
  return left.localeCompare(right, locale);
}

export function buildAlphabetContactSections(
  contacts: Contact[],
  locale: string,
): ContactSection[] {
  const grouped = new Map<string, Contact[]>();

  for (const contact of contacts) {
    const letter = getContactSectionLetter(contact, locale);
    const bucket = grouped.get(letter) ?? [];
    bucket.push(contact);
    grouped.set(letter, bucket);
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => compareByLocale(left, right, locale))
    .map(([title, data]) => ({
      data: [...data].sort((left, right) =>
        compareByLocale(formatContactName(left), formatContactName(right), locale),
      ),
      kind: "alphabet" as const,
      title,
    }));
}
