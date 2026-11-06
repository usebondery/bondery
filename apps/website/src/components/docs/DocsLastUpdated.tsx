import { formatCalendarDate } from "@bondery/helpers";

export interface DocsLastUpdatedProps {
  /** Calendar date from the page frontmatter, e.g. `2026-09-30`. */
  date: string;
}

/**
 * Renders "Last updated September 30, 2026".
 *
 * The date is absolute, so it is the same on every render and needs no clock.
 * It renders on the server, which keeps the line in the first response and keeps
 * this a server component.
 */
export function DocsLastUpdated({ date }: DocsLastUpdatedProps) {
  const formatted = formatCalendarDate(date);

  if (formatted === null) {
    return null;
  }

  return <span>Last updated {formatted}</span>;
}
