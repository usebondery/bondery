import { GroupDetailClient } from "./GroupDetailClient";
import { API_URL } from "@/lib/config";
import type { Contact, Group } from "@bondery/types";
import { getAuthHeaders } from "@/lib/authHeaders";
import { notFound } from "next/navigation";
import { API_ROUTES } from "@bondery/helpers";

interface GroupContactsResponse {
  group: { id: string; label: string };
  contacts: Contact[];
  totalCount: number;
}

async function getGroupContacts(groupId: string): Promise<GroupContactsResponse> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}${API_ROUTES.GROUPS}/${groupId}/contacts`, {
      cache: "no-store",
      headers,
    });

    if (!res.ok) {
      if (res.status === 404) {
        notFound();
      }
      throw new Error(`Failed to fetch group contacts: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();

    // Ensure lastInteraction is a Date object
    const contacts = data.contacts.map((contact: Contact) => ({
      ...contact,
      lastInteraction: contact.lastInteraction ? new Date(contact.lastInteraction) : null,
      createdAt: contact.createdAt ? new Date(contact.createdAt) : null,
    }));

    return {
      group: data.group,
      contacts,
      totalCount: data.totalCount,
    };
  } catch (error) {
    console.error("Error fetching group contacts:", error);
    throw error;
  }
}

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const { group, contacts, totalCount } = await getGroupContacts(groupId);

  return (
    <GroupDetailClient
      groupId={groupId}
      groupLabel={group.label}
      initialContacts={contacts}
      totalCount={totalCount}
    />
  );
}
