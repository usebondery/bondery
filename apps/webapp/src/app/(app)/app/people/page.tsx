import { PeopleClient } from "./PeopleClient";
import { getContactsData, type SortOrder } from "./getContactsData";

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const query = params.q;
  const sort = params.sort as SortOrder | undefined;

  const { contacts, totalCount } = await getContactsData(query, sort);

  return <PeopleClient initialContacts={contacts} totalCount={totalCount} />;
}
