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
        key: `header-${section.title}`,
        letter: section.title,
        title: section.title,
        type: "section-header",
      });
      stickyHeaderIndices.push(headerIndex);
      letterToIndex.set(section.title, headerIndex);
    }

    for (const contact of section.data) {
      rows.push({
        contact,
        key: contact.id,
        sectionKind: section.kind,
        type: "contact",
      });
    }
  }

  return { letterToIndex, rows, stickyHeaderIndices };
}
