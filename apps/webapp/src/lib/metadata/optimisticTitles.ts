import { formatContactName } from "@bondery/helpers/contact";
import type { Contact, ContactPreview } from "@bondery/schemas";
import { formatEntityTitleString } from "@/lib/metadata/pageTitles";

type PersonLike = Pick<Contact, "firstName" | "middleName" | "lastName"> | ContactPreview;

export function optimisticPersonDocumentTitle(person: PersonLike): string {
  return formatEntityTitleString(formatContactName(person as Contact));
}

export function optimisticGroupDocumentTitle(label: string): string {
  return formatEntityTitleString(label.trim());
}
