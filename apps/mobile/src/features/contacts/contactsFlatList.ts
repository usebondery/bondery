import type { Contact } from "@bondery/schemas";

export type ContactSectionKind = "myself" | "alphabet" | "search";

export type ContactSection = {
  title: string;
  kind: ContactSectionKind;
  data: Contact[];
};

export type ContactsFlatRow =
  | {
      type: "section-header";
      key: string;
      title: string;
      letter: string;
    }
  | {
      type: "contact";
      key: string;
      contact: Contact;
      sectionKind: ContactSectionKind;
    };

export const CONTACTS_LIST_ROW_HEIGHT = 56;
export const CONTACTS_SECTION_HEADER_HEIGHT = 33;

export function buildContactsFlatRows(sections: ContactSection[]) {
  const rows: ContactsFlatRow[] = [];
  const stickyHeaderIndices: number[] = [];
  const letterToIndex = new Map<string, number>();

  for (const section of sections) {
    if (section.title && section.kind !== "search") {
      const headerIndex = rows.length;
      rows.push({
        type: "section-header",
        key: `header-${section.title}`,
        title: section.title,
        letter: section.title,
      });
      stickyHeaderIndices.push(headerIndex);
      letterToIndex.set(section.title, headerIndex);
    }

    for (const contact of section.data) {
      rows.push({
        type: "contact",
        key: contact.id,
        contact,
        sectionKind: section.kind,
      });
    }
  }

  return { rows, stickyHeaderIndices, letterToIndex };
}
