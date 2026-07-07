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
import { PersonLoader } from "./PersonLoader";
import { serverApiFetch } from "@/lib/api/server";
import { API_ROUTES, formatMetadataTitle } from "@bondery/helpers/globals/paths";
import { getWebTranslations as getTranslations } from "@/lib/i18n/getWebTranslations";
import { PageWrapper } from "@/app/(app)/app/components/PageWrapper";
import { ErrorPageHeader } from "@/app/(app)/app/components/ErrorPageHeader";
import type { Group, Tag } from "@bondery/schemas";
import { buildAvatarQueryString } from "@/lib/avatarParams";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ person_id: string }>;
}): Promise<Metadata> {
  try {
    const { person_id: personId } = await params;
    const res = await serverApiFetch(`${API_ROUTES.CONTACTS}/${personId}`, undefined, {
      cache: "no-store",
    });
    if (!res.ok) {
      const t = await getTranslations("SingleContactPage");
      return { title: formatMetadataTitle(t("PersonFallbackTitle")) };
    }
    const data = await res.json();
    const contact = data.contact;
    const fullName = [contact.firstName, contact.middleName, contact.lastName]
      .filter(Boolean)
      .join(" ");
    return { title: formatMetadataTitle(fullName) };
  } catch {
    const t = await getTranslations("SingleContactPage");
    return { title: formatMetadataTitle(t("PersonFallbackTitle")) };
  }
}

async function getPersonData(personId: string) {
  const contactPromise = serverApiFetch(
    `${API_ROUTES.CONTACTS}/${personId}?${buildAvatarQueryString("large")}`,
    undefined,
    { cache: "no-store" },
  );

  const groupsPromise = serverApiFetch(API_ROUTES.GROUPS, undefined, {
    next: { tags: ["groups"] },
  });

  const membershipPromise = serverApiFetch(`${API_ROUTES.CONTACTS}/${personId}/groups`, undefined, {
    next: { tags: ["groups", "contacts"] },
  });

  const interactionsPromise = serverApiFetch(
    `${API_ROUTES.INTERACTIONS}?${buildAvatarQueryString("medium")}`,
    undefined,
    { next: { tags: ["interactions"] } },
  );

  const relationshipsPromise = serverApiFetch(
    `${API_ROUTES.CONTACTS}/${personId}/relationships?${buildAvatarQueryString("small")}`,
    undefined,
    { next: { tags: ["relationships", "contacts"] } },
  );

  const importantDatesPromise = serverApiFetch(
    `${API_ROUTES.CONTACTS}/${personId}/important-dates`,
    undefined,
    { next: { tags: ["important-dates", "contacts"] } },
  );

  const contactsPromise = serverApiFetch(
    `${API_ROUTES.CONTACTS}?${buildAvatarQueryString("small")}`,
    undefined,
    { next: { tags: ["contacts"] } },
  );

  const allTagsPromise = serverApiFetch(`${API_ROUTES.TAGS}?previewLimit=0`, undefined, {
    next: { tags: ["tags"] },
  });

  const personTagsPromise = serverApiFetch(`${API_ROUTES.CONTACTS}/${personId}/tags`, undefined, {
    next: { tags: ["tags", "contacts"] },
  });

  const linkedInDataPromise = serverApiFetch(
    `${API_ROUTES.CONTACTS}/${personId}/linkedin-data`,
    undefined,
    { next: { tags: ["contacts"] } },
  );

  const mergeRecommendationsPromise = getMergeRecommendationsData().catch(
    () => [] as MergeRecommendation[],
  );

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
    allMergeRecommendations,
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
    mergeRecommendationsPromise,
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
    : { workHistory: [], education: [], linkedinBio: null, syncedAt: null };

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
    syncedAt: (linkedInData.syncedAt as string | null) ?? null,
    mergeRecommendation:
      (allMergeRecommendations as MergeRecommendation[]).find(
        (r) => r.leftPerson.id === personId || r.rightPerson.id === personId,
      ) ?? null,
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
  const t = await getTranslations("SingleContactPage");

  if (!personId) {
    return (
      <PageWrapper>
        <ErrorPageHeader iconType="user" title={t("PersonNotFound")} backHref={API_ROUTES.CONTACTS} />
        <Stack gap="xl">
          <Text c="dimmed">{t("PersonNotSelected")}</Text>
        </Stack>
      </PageWrapper>
    );
  }

  const data = await getPersonData(personId);

  if (!data) {
    return (
      <PageWrapper>
        <ErrorPageHeader iconType="user" title={t("PersonNotFound")} backHref={API_ROUTES.CONTACTS} />
        <Stack gap="xl">
          <Text c="dimmed">{t("PersonNotFoundDescription")}</Text>
        </Stack>
      </PageWrapper>
    );
  }

  return (
    <PersonLoader
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
      initialSyncedAt={data.syncedAt}
      initialMergeRecommendation={data.mergeRecommendation}
      personId={personId}
      initialTab={typeof tab === "string" ? tab : undefined}
    />
  );
}
