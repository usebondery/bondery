import type { InlineToken } from "@bondery/helpers";
import { formatContactName } from "@bondery/helpers/contact";
import type { Contact, Group, Interaction, Tag } from "@bondery/schemas";

/**
 * Reads the record behind a chip token.
 *
 * A reader supplies only the records it holds. A missing reader and a missing
 * record both mean "unknown", so the caller skips the token.
 */
export interface TokenLookup {
  getContact?: (
    id: string,
  ) => Pick<Contact, "firstName" | "lastName" | "middleName"> | null | undefined;
  getGroup?: (id: string) => Pick<Group, "label"> | null | undefined;
  getInteraction?: (id: string) => Pick<Interaction, "title"> | null | undefined;
  getTag?: (id: string) => Pick<Tag, "label"> | null | undefined;
}

/**
 * Visual label of a chip token, exactly as the chip shows it.
 *
 * Chips and speech share this function, so the spoken name matches the name on
 * screen. Returns `null` when the record is unknown or the token has no label.
 */
export function inlineTokenLabel(token: InlineToken, lookup: TokenLookup): string | null {
  switch (token.type) {
    case "person": {
      const contact = lookup.getContact?.(token.id);
      if (!contact) {
        return null;
      }
      const name = formatContactName(contact).trim();
      return name || null;
    }
    case "group":
      return lookup.getGroup?.(token.id)?.label ?? null;
    case "tag":
      return lookup.getTag?.(token.id)?.label ?? null;
    case "interaction":
      return lookup.getInteraction?.(token.id)?.title ?? null;
    case "action":
    case "date":
    case "link":
    case "text":
      return null;
  }
}
