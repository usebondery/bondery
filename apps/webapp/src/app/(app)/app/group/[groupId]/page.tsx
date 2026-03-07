import type { Metadata } from "next";
import { GroupDetailClient } from "./GroupDetailClient";
import { API_URL } from "@/lib/config";
import type { Contact } from "@bondery/types";
import { getAuthHeaders } from "@/lib/authHeaders";
import { notFound } from "next/navigation";
import { API_ROUTES, formatMetadataTitle } from "@bondery/helpers/globals/paths";
import type { SortOrder } from "@/app/(app)/app/components/contacts/ContactsTableV2";

const PAGE_SIZE = 50;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ groupId: string }>;
}): Promise<Metadata> {
  try {
    const { groupId } = await params;
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}${API_ROUTES.GROUPS}/${groupId}`, {
      next: { tags: ["groups"] },
      headers,
    });
    if (!res.ok) return { title: "Group" };
    const data = await res.json();
    const label = data.group?.label || "Group";
    return { title: formatMetadataTitle(label) };
  } catch {
    return { title: "Group" };
  }
}

interface GroupContactsResponse {
  group: { id: string; label: string; emoji?: string | null; color?: string | null };
  contacts: Contact[];
  totalCount: number;
  cardPreviewContacts: Contact[];
  groupTotalCount: number;
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

    // Preview contacts for the group card avatar — always unfiltered so the
    // avatars stay stable regardless of what the user searches in the table.
    const previewParams = new URLSearchParams();
    previewParams.set("limit", "3");
    previewParams.set("offset", "0");

    // Fire all three requests in parallel — they are independent
    const [res, groupRes, previewRes] = await Promise.all([
      fetch(`${API_URL}${API_ROUTES.GROUPS}/${groupId}/contacts?${params.toString()}`, {
        next: { tags: ["groups", "contacts"] },
        headers,
      }),
      fetch(`${API_URL}${API_ROUTES.GROUPS}/${groupId}`, {
        next: { tags: ["groups"] },
        headers,
      }),
      fetch(`${API_URL}${API_ROUTES.GROUPS}/${groupId}/contacts?${previewParams.toString()}`, {
        next: { tags: ["groups", "contacts"] },
        headers,
      }),
    ]);

    if (!res.ok) {
      if (res.status === 404) {
        notFound();
      }
      throw new Error(`Failed to fetch group contacts: ${res.status} ${res.statusText}`);
    }

    const [data, groupData, previewData] = await Promise.all([
      res.json(),
      groupRes.ok
        ? (groupRes.json() as Promise<{
            group?: { id: string; label: string; emoji?: string | null; color?: string | null };
          }>)
        : Promise.resolve(null),
      previewRes.ok ? previewRes.json() : Promise.resolve({ contacts: [] }),
    ]);

    const contacts = data.contacts.map((contact: Contact) => ({
      ...contact,
      lastInteraction: contact.lastInteraction ? new Date(contact.lastInteraction) : null,
      createdAt: contact.createdAt ? new Date(contact.createdAt) : null,
    }));

    const cardPreviewContacts = (previewData.contacts ?? []).map(
      (contact: Contact) => ({
        ...contact,
        lastInteraction: contact.lastInteraction ? new Date(contact.lastInteraction) : null,
        createdAt: contact.createdAt ? new Date(contact.createdAt) : null,
      }),
    );

    return {
      group: {
        id: groupData?.group?.id || data.group.id,
        label: groupData?.group?.label || data.group.label,
        emoji: groupData?.group?.emoji ?? null,
        color: groupData?.group?.color ?? null,
      },
      contacts,
      totalCount: data.totalCount,
      cardPreviewContacts,
      // Real group member count — always unfiltered, used for the group card
      groupTotalCount: previewData.totalCount ?? data.totalCount,
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

  const { group, contacts, totalCount, cardPreviewContacts, groupTotalCount } =
    await getGroupContacts(groupId, q, sort);

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
      cardPreviewContacts={cardPreviewContacts}
      groupTotalCount={groupTotalCount}
    />
  );
}
