"use server";

import { Stack, Text } from "@mantine/core";
import type { Contact } from "@bondery/types";
import PersonClient from "./PersonClient";
import { getAuthHeaders } from "@/lib/authHeaders";
import { API_ROUTES } from "@bondery/helpers";
import { PageWrapper } from "@/app/(app)/app/components/PageWrapper";
import { ErrorPageHeader } from "@/app/(app)/app/components/ErrorPageHeader";
import type { Group } from "@bondery/types";
import { API_URL } from "@/lib/config";

async function getPersonData(personId: string) {
  const headers = await getAuthHeaders();

  const contactPromise = fetch(`${API_URL}${API_ROUTES.CONTACTS}/${personId}`, {
    cache: "no-store",
    headers,
  });

  const groupsPromise = fetch(`${API_URL}${API_ROUTES.GROUPS}`, {
    cache: "no-store",
    headers,
  });

  const membershipPromise = fetch(`${API_URL}${API_ROUTES.CONTACTS}/${personId}/groups`, {
    cache: "no-store",
    headers,
  });

  const [contactResponse, groupsResponse, membershipResponse] = await Promise.all([
    contactPromise,
    groupsPromise,
    membershipPromise,
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

  // Fetch connected contacts if they exist
  let connectedContacts: Contact[] = [];
  if (contact.connections && contact.connections.length > 0) {
    const connectionPromises = contact.connections.map((id: string) =>
      fetch(`${API_URL}${API_ROUTES.CONTACTS}/${id}`, {
        cache: "no-store",
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
    groups: (groupsData.groups as Group[]) || [],
    personGroups: (personGroupsData.groups as Group[]) || [],
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
      initialGroups={data.groups}
      initialPersonGroups={data.personGroups}
      personId={personId}
    />
  );
}
