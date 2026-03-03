import { GroupDetailClient } from "./GroupDetailClient";
import { API_URL } from "@/lib/config";
import type { Contact } from "@bondery/types";
import { getAuthHeaders } from "@/lib/authHeaders";
import { notFound } from "next/navigation";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { SortOrder } from "@/app/(app)/app/components/contacts/ContactsTableV2";

const PAGE_SIZE = 50;

interface GroupContactsResponse {
  group: { id: string; label: string; emoji?: string | null; color?: string | null };
  contacts: Contact[];
  totalCount: number;
}

async function getGroupContacts(
  groupId: string,
  query?: string,
  sort?: string,
): Promise<GroupContactsResponse> {
  try {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", "0");
    if (query) params.set("q", query);
    if (sort) params.set("sort", sort);

    const res = await fetch(
      `${API_URL}${API_ROUTES.GROUPS}/${groupId}/contacts?${params.toString()}`,
      { next: { tags: ["groups", "contacts"] }, headers },
    );

    if (!res.ok) {
      if (res.status === 404) {
        notFound();
      }
      throw new Error(`Failed to fetch group contacts: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();

    // Fetch group details (emoji, color) separately – contacts endpoint only returns id+label.
    const groupRes = await fetch(`${API_URL}${API_ROUTES.GROUPS}/${groupId}`, {
      next: { tags: ["groups"] },
      headers,
    });

    const groupData = groupRes.ok
      ? ((await groupRes.json()) as {
          group?: { id: string; label: string; emoji?: string | null; color?: string | null };
        })
      : null;

    const contacts = data.contacts.map((contact: Contact) => ({
      ...contact,
      lastInteraction: contact.lastInteraction ? new Date(contact.lastInteraction) : null,
      createdAt: contact.createdAt ? new Date(contact.createdAt) : null,
    }));

    return {
      group: {
        id: groupData?.group?.id || data.group.id,
        label: groupData?.group?.label || data.group.label,
        emoji: groupData?.group?.emoji ?? null,
        color: groupData?.group?.color ?? null,
      },
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
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  const { groupId } = await params;
  const { q, sort } = await searchParams;

  const { group, contacts, totalCount } = await getGroupContacts(groupId, q, sort);

  return (
    <GroupDetailClient
      groupId={groupId}
      groupLabel={group.label}
      groupEmoji={group.emoji || ""}
      groupColor={group.color || ""}
      initialContacts={contacts}
      totalCount={totalCount}
      initialSearch={q || ""}
      initialSort={(sort as SortOrder) || "nameAsc"}
    />
  );
}
