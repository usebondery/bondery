import { PeopleClient } from "../PeopleClient";
import { getContactsData, type SortOrder } from "../getContactsData";

interface PeopleTableLoaderProps {
  query?: string;
  sort?: SortOrder;
  savedColumnVisibility?: { key: string; visible: boolean }[];
}

/**
 * Async server component that fetches contacts data and renders PeopleClient.
 * Intentionally separate from page.tsx so it can be wrapped in a Suspense
 * boundary — the page shell (header, layout) renders immediately while this
 * component streams in once the data resolves.
 */
export async function PeopleTableLoader({
  query,
  sort,
  savedColumnVisibility,
}: PeopleTableLoaderProps) {
  const { contacts, totalCount } = await getContactsData(query, sort);

  return (
    <PeopleClient
      initialContacts={contacts}
      totalCount={totalCount}
      savedColumnVisibility={savedColumnVisibility}
    />
  );
}
