import { Container, Stack, Title, Text } from "@mantine/core";
import { getBaseUrl } from "@/lib/config";
import type { Contact } from "@/lib/mockData";
import PersonClient from "./PersonClient";
import { getAuthHeaders } from "@/lib/authHeaders";

async function getPersonData(personId: string) {
  const headers = await getAuthHeaders();

  // Fetch individual contact via API
  const contactResponse = await fetch(`${getBaseUrl()}/api/contacts/${personId}`, {
    cache: "no-store",
    headers,
  });

  if (!contactResponse.ok) {
    return null;
  }

  const contactData = await contactResponse.json();
  const contact = {
    ...contactData.contact,
    lastInteraction: new Date(contactData.contact.lastInteraction),
    createdAt: contactData.contact.createdAt ? new Date(contactData.contact.createdAt) : undefined,
  };

  // Fetch connected contacts if they exist
  let connectedContacts: Contact[] = [];
  if (contact.connections && contact.connections.length > 0) {
    const connectionPromises = contact.connections.map((id: string) =>
      fetch(`${getBaseUrl()}/api/contacts/${id}`, {
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

  return { contact, connectedContacts };
}

export default async function PersonPage({
  searchParams,
}: {
  searchParams: Promise<{ person_id?: string }>;
}) {
  const params = await searchParams;
  const personId = params.person_id;

  if (!personId) {
    return (
      <Container size="xl">
        <Stack gap="xl" mt="xl">
          <Title order={1}>Person not found</Title>
          <Text c="dimmed">Please select a person to view their details.</Text>
        </Stack>
      </Container>
    );
  }

  const data = await getPersonData(personId);

  if (!data) {
    return (
      <Container size="xl">
        <Stack gap="xl" mt="xl">
          <Title order={1}>Person not found</Title>
          <Text c="dimmed">The requested contact could not be found.</Text>
        </Stack>
      </Container>
    );
  }

  return (
    <PersonClient
      initialContact={data.contact}
      initialConnectedContacts={data.connectedContacts}
      personId={personId}
    />
  );
}
