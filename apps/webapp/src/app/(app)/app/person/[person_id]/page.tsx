import type { Metadata } from "next";
import { Stack, Text } from "@mantine/core";
import type {
  Contact,
  Activity,
  ContactRelationshipWithPeople,
  ImportantDate,
  WorkHistoryEntry,
  EducationEntry,
} from "@bondery/types";
import PersonClient from "./PersonClient";
import { getAuthHeaders } from "@/lib/authHeaders";
import { API_ROUTES, formatMetadataTitle } from "@bondery/helpers/globals/paths";
import { PageWrapper } from "@/app/(app)/app/components/PageWrapper";
import { ErrorPageHeader } from "@/app/(app)/app/components/ErrorPageHeader";
import type { Group, Tag } from "@bondery/types";
import { API_URL } from "@/lib/config";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ person_id: string }>;
}): Promise<Metadata> {
  try {
    const { person_id: personId } = await params;
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}${API_ROUTES.CONTACTS}/${personId}`, {
      next: { tags: ["contacts"] },
      headers,
    });
    if (!res.ok) return { title: "Person" };
    const data = await res.json();
    const contact = data.contact;
    const fullName = [contact.firstName, contact.middleName, contact.lastName]
      .filter(Boolean)
      .join(" ");
    return { title: formatMetadataTitle(fullName) };
  } catch {
    return { title: "Person" };
  }
}

async function getPersonData(personId: string) {
  const headers = await getAuthHeaders();

  const contactPromise = fetch(`${API_URL}${API_ROUTES.CONTACTS}/${personId}`, {
    next: { tags: ["contacts"] },
    headers,
  });

  const groupsPromise = fetch(`${API_URL}${API_ROUTES.GROUPS}`, {
    next: { tags: ["groups"] },
    headers,
  });

  const membershipPromise = fetch(`${API_URL}${API_ROUTES.CONTACTS}/${personId}/groups`, {
    next: { tags: ["groups", "contacts"] },
    headers,
  });

  const interactionsPromise = fetch(`${API_URL}${API_ROUTES.INTERACTIONS}`, {
    next: { tags: ["interactions"] },
    headers,
  });

  const relationshipsPromise = fetch(`${API_URL}${API_ROUTES.CONTACTS}/${personId}/relationships`, {
    next: { tags: ["relationships", "contacts"] },
    headers,
  });

  const importantDatesPromise = fetch(
    `${API_URL}${API_ROUTES.CONTACTS}/${personId}/important-dates`,
    {
      next: { tags: ["important-dates", "contacts"] },
      headers,
    },
  );

  const contactsPromise = fetch(`${API_URL}${API_ROUTES.CONTACTS}`, {
    next: { tags: ["contacts"] },
    headers,
  });

  const allTagsPromise = fetch(`${API_URL}${API_ROUTES.TAGS}?previewLimit=0`, {
    next: { tags: ["tags"] },
    headers,
  });

  const personTagsPromise = fetch(`${API_URL}${API_ROUTES.CONTACTS}/${personId}/tags`, {
    next: { tags: ["tags", "contacts"] },
    headers,
  });

  const linkedInDataPromise = fetch(`${API_URL}${API_ROUTES.CONTACTS}/${personId}/linkedin-data`, {
    next: { tags: ["contacts"] },
    headers,
  });

  const [
    contactResponse,
    groupsResponse,
    membershipResponse,
    interactionsResponse,
    relationshipsResponse,
    importantDatesResponse,
    contactsResponse,
    allTagsResponse,
    personTagsResponse,
    linkedInDataResponse,
  ] = await Promise.all([
    contactPromise,
    groupsPromise,
    membershipPromise,
    interactionsPromise,
    relationshipsPromise,
    importantDatesPromise,
    contactsPromise,
    allTagsPromise,
    personTagsPromise,
    linkedInDataPromise,
  ]);

  if (!contactResponse.ok) {
    return null;
  }

  const contactData = await contactResponse.json();
  const contact = {
    ...contactData.contact,
    lastInteraction: new Date(contactData.contact.lastInteraction),
    createdAt: contactData.contact.createdAt ? new Date(contactData.contact.createdAt) : undefined,
  };

  const groupsData = groupsResponse.ok ? await groupsResponse.json() : { groups: [] };
  const personGroupsData = membershipResponse.ok ? await membershipResponse.json() : { groups: [] };
  const interactionsData = interactionsResponse.ok
    ? await interactionsResponse.json()
    : { interactions: [] };
  const relationshipsData = relationshipsResponse.ok
    ? await relationshipsResponse.json()
    : { relationships: [] };
  const importantDatesData = importantDatesResponse.ok
    ? await importantDatesResponse.json()
    : { dates: [] };
  const contactsData = contactsResponse.ok ? await contactsResponse.json() : { contacts: [] };

  const allTagsData = allTagsResponse.ok ? await allTagsResponse.json() : { tags: [] };
  const personTagsData = personTagsResponse.ok ? await personTagsResponse.json() : { tags: [] };
  const linkedInData = linkedInDataResponse.ok
    ? await linkedInDataResponse.json()
    : { workHistory: [], education: [], linkedinBio: null };

  const personActivities =
    interactionsData.interactions?.filter((a: any) =>
      a.participants?.some((p: any) => p.id === personId),
    ) || [];

  return {
    contact,
    connectedContacts: [],
    selectableContacts:
      ((contactsData.contacts as Contact[]) || []).filter(
        (candidate) => candidate.id !== personId,
      ) || [],
    relationships: (relationshipsData.relationships as ContactRelationshipWithPeople[]) || [],
    importantDates: (importantDatesData.dates as ImportantDate[]) || [],
    groups: (groupsData.groups as Group[]) || [],
    personGroups: (personGroupsData.groups as Group[]) || [],
    allTags: (allTagsData.tags as Tag[]) || [],
    personTags: (personTagsData.tags as Tag[]) || [],
    activities: (personActivities as Activity[]) || [],
    workHistory: (linkedInData.workHistory as WorkHistoryEntry[]) || [],
    education: (linkedInData.education as EducationEntry[]) || [],
    linkedinBio: (linkedInData.linkedinBio as string | null) ?? null,
  };
}

export default async function PersonPage({
  params,
  searchParams,
}: {
  params: Promise<{ person_id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { person_id: personId } = await params;
  const { tab } = await searchParams;

  if (!personId) {
    return (
      <PageWrapper>
        <ErrorPageHeader iconType="user" title="Person not found" backHref={API_ROUTES.CONTACTS} />
        <Stack gap="xl">
          <Text c="dimmed">Please select a person to view their details.</Text>
        </Stack>
      </PageWrapper>
    );
  }

  const data = await getPersonData(personId);

  if (!data) {
    return (
      <PageWrapper>
        <ErrorPageHeader iconType="user" title="Person not found" backHref={API_ROUTES.CONTACTS} />
        <Stack gap="xl">
          <Text c="dimmed">The requested contact could not be found.</Text>
        </Stack>
      </PageWrapper>
    );
  }

  return (
    <PersonClient
      initialContact={data.contact}
      initialConnectedContacts={data.connectedContacts}
      initialSelectableContacts={data.selectableContacts}
      initialRelationships={data.relationships}
      initialImportantDates={data.importantDates}
      initialGroups={data.groups}
      initialPersonGroups={data.personGroups}
      initialAllTags={data.allTags}
      initialPersonTags={data.personTags}
      initialActivities={data.activities}
      initialWorkHistory={data.workHistory}
      initialEducation={data.education}
      initialLinkedinBio={data.linkedinBio}
      personId={personId}
      initialTab={typeof tab === "string" ? tab : undefined}
    />
  );
}
