import { formatMetadataTitle } from "@bondery/helpers/globals/paths";
import type { Metadata } from "next";

/** List/settings pages — plain title, no "• Bondery" suffix. */
export function staticPageTitle(title: string): Pick<Metadata, "title"> {
  return { title: { absolute: title } };
}

/** Entity detail pages — "{Name} • Bondery". */
export function entityPageTitle(name: string): Pick<Metadata, "title"> {
  return { title: { absolute: formatEntityTitleString(name) } };
}

/** Client coordinator: "{Name} • Bondery". */
export function formatEntityTitleString(name: string): string {
  return formatMetadataTitle(name);
}
