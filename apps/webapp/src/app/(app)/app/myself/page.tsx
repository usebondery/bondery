import type { Metadata } from "next";
import { Stack, Text } from "@mantine/core";
import type {
  Contact,
  Activity,
  ContactRelationshipWithPeople,
  ImportantDate,
  MergeRecommendation,
  WorkHistoryEntry,
  EducationEntry,
} from "@bondery/schemas";
import { getMergeRecommendationsData } from "@/app/(app)/app/fix/getMergeRecommendationsData";
import PersonClient from "../person/[person_id]/PersonClient";
import { serverApiFetch } from "@/lib/api/server";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { PageWrapper } from "@/app/(app)/app/components/PageWrapper";
import { ErrorPageHeader } from "@/app/(app)/app/components/ErrorPageHeader";
import type { Group, Tag } from "@bondery/schemas";
import { buildAvatarQueryString } from "@/lib/avatarParams";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Myself" };
}

async function getMyselfData() {
  const contactResponse = await serverApiFetch(
    `${API_ROUTES.ME_PERSON}?${buildAvatarQueryString("large")}`,
    undefined,
    { next: { tags: ["contacts"] } },
  );

  if (!contactResponse.ok) {
    return null;
  }

  const contactData = await contactResponse.json();
  const contact = {
    ...contactData.contact,
    lastInteraction: new Date(contactData.contact.lastInteraction),
    createdAt: contactData.contact.createdAt ? new Date(contactData.contact.createdAt) : undefined,
  };

  const personId = contact.id as string;

  // Fetch remaining data in parallel using the personId
  const [
    groupsResponse,
    membershipResponse,
    interactionsResponse,
    relationshipsResponse,
    importantDatesResponse,
    contactsResponse,
    allTagsResponse,
    personTagsResponse,
    linkedInDataResponse,
    allMergeRecommendations,
  ] = await Promise.all([
    serverApiFetch(API_ROUTES.GROUPS, undefined, { next: { tags: ["groups"] } }),
    serverApiFetch(`${API_ROUTES.CONTACTS}/${personId}/groups`, undefined, {
      next: { tags: ["groups", "contacts"] },
    }),
    serverApiFetch(`${API_ROUTES.INTERACTIONS}?${buildAvatarQueryString("medium")}`, undefined, {
      next: { tags: ["interactions"] },
    }),
    serverApiFetch(
      `${API_ROUTES.CONTACTS}/${personId}/relationships?${buildAvatarQueryString("small")}`,
      undefined,
      { next: { tags: ["relationships", "contacts"] } },
    ),
    serverApiFetch(`${API_ROUTES.CONTACTS}/${personId}/important-dates`, undefined, {
      next: { tags: ["important-dates", "contacts"] },
    }),
    serverApiFetch(`${API_ROUTES.CONTACTS}?${buildAvatarQueryString("small")}`, undefined, {
      next: { tags: ["contacts"] },
    }),
    serverApiFetch(`${API_ROUTES.TAGS}?previewLimit=0`, undefined, { next: { tags: ["tags"] } }),
    serverApiFetch(`${API_ROUTES.CONTACTS}/${personId}/tags`, undefined, {
      next: { tags: ["tags", "contacts"] },
    }),
    serverApiFetch(`${API_ROUTES.CONTACTS}/${personId}/linkedin-data`, undefined, {
      next: { tags: ["contacts"] },
    }),
    getMergeRecommendationsData().catch(() => [] as MergeRecommendation[]),
  ]);

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
    : { workHistory: [], education: [], linkedinBio: null, syncedAt: null };

  const personActivities =
    interactionsData.interactions?.filter((a: any) =>
      a.participants?.some((p: any) => p.id === personId),
    ) || [];

  return {
    contact,
    personId,
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
    syncedAt: (linkedInData.syncedAt as string | null) ?? null,
    mergeRecommendation:
      (allMergeRecommendations as MergeRecommendation[]).find(
        (r) => r.leftPerson.id === personId || r.rightPerson.id === personId,
      ) ?? null,
  };
}

export default async function MyselfPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { tab } = await searchParams;

  const data = await getMyselfData();

  if (!data) {
    return (
      <PageWrapper>
        <ErrorPageHeader iconType="user" title="Profile not found" backHref={API_ROUTES.CONTACTS} />
        <Stack gap="xl">
          <Text c="dimmed">Your profile contact could not be found.</Text>
        </Stack>
      </PageWrapper>
    );
  }

  return (
    <PersonClient
      initialContact={data.contact}
      initialConnectedContacts={[]}
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
      initialSyncedAt={data.syncedAt}
      initialMergeRecommendation={data.mergeRecommendation}
      personId={data.personId}
      initialTab={typeof tab === "string" ? tab : undefined}
      myselfMode
    />
  );
}
