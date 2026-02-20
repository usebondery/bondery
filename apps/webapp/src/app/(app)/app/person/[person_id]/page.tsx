"use server";

import { Stack, Text } from "@mantine/core";
import type {
  Contact,
  Activity,
  ContactRelationshipWithPeople,
  ImportantEvent,
} from "@bondery/types";
import PersonClient from "./PersonClient";
import { getAuthHeaders } from "@/lib/authHeaders";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { PageWrapper } from "@/app/(app)/app/components/PageWrapper";
import { ErrorPageHeader } from "@/app/(app)/app/components/ErrorPageHeader";
import type { Group } from "@bondery/types";
import { API_URL } from "@/lib/config";

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

  const eventsPromise = fetch(`${API_URL}${API_ROUTES.EVENTS}`, {
    next: { tags: ["events"] },
    headers,
  });

  const relationshipsPromise = fetch(`${API_URL}${API_ROUTES.CONTACTS}/${personId}/relationships`, {
    next: { tags: ["relationships", "contacts"] },
    headers,
  });

  const importantEventsPromise = fetch(
    `${API_URL}${API_ROUTES.CONTACTS}/${personId}/important-events`,
    {
      next: { tags: ["important-events", "contacts"] },
      headers,
    },
  );

  const contactsPromise = fetch(`${API_URL}${API_ROUTES.CONTACTS}`, {
    next: { tags: ["contacts"] },
    headers,
  });

  const [
    contactResponse,
    groupsResponse,
    membershipResponse,
    eventsResponse,
    relationshipsResponse,
    importantEventsResponse,
    contactsResponse,
  ] = await Promise.all([
    contactPromise,
    groupsPromise,
    membershipPromise,
    eventsPromise,
    relationshipsPromise,
    importantEventsPromise,
    contactsPromise,
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
  const eventsData = eventsResponse.ok ? await eventsResponse.json() : { events: [] };
  const relationshipsData = relationshipsResponse.ok
    ? await relationshipsResponse.json()
    : { relationships: [] };
  const importantEventsData = importantEventsResponse.ok
    ? await importantEventsResponse.json()
    : { events: [] };
  const contactsData = contactsResponse.ok ? await contactsResponse.json() : { contacts: [] };

  const personActivities =
    eventsData.events?.filter((a: any) => a.participants?.some((p: any) => p.id === personId)) ||
    [];

  // Fetch connected contacts if they exist
  let connectedContacts: Contact[] = [];
  if (contact.connections && contact.connections.length > 0) {
    const connectionPromises = contact.connections.map((id: string) =>
      fetch(`${API_URL}${API_ROUTES.CONTACTS}/${id}`, {
        next: { tags: ["contacts"] },
        headers,
      }).then((res) => res.json()),
    );

    const connectionsData = await Promise.all(connectionPromises);
    connectedContacts = connectionsData
      .filter((data) => data.contact)
      .map((data) => ({
        ...data.contact,
        lastInteraction: new Date(data.contact.lastInteraction),
        createdAt: data.contact.createdAt ? new Date(data.contact.createdAt) : undefined,
      }));
  }

  return {
    contact,
    connectedContacts,
    selectableContacts:
      ((contactsData.contacts as Contact[]) || []).filter(
        (candidate) => candidate.id !== personId,
      ) || [],
    relationships: (relationshipsData.relationships as ContactRelationshipWithPeople[]) || [],
    importantEvents: (importantEventsData.events as ImportantEvent[]) || [],
    groups: (groupsData.groups as Group[]) || [],
    personGroups: (personGroupsData.groups as Group[]) || [],
    activities: (personActivities as Activity[]) || [],
  };
}

export default async function PersonPage({ params }: { params: Promise<{ person_id: string }> }) {
  const { person_id: personId } = await params;

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
      initialImportantEvents={data.importantEvents}
      initialGroups={data.groups}
      initialPersonGroups={data.personGroups}
      initialActivities={data.activities}
      personId={personId}
    />
  );
}
