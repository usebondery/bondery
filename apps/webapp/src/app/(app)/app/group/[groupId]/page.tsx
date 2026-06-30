import type { Metadata } from "next";
import { GroupDetailClient } from "./GroupDetailClient";
import { serverApiFetch } from "@/lib/api/server";
import type { Contact } from "@bondery/schemas";
import { notFound } from "next/navigation";
import { API_ROUTES, formatMetadataTitle } from "@bondery/helpers/globals/paths";
import { appendAvatarParams } from "@/lib/avatarParams";
import {
  parseContactsListParams,
  type ContactsListFilterParams,
} from "@/lib/query/fetchers/contactsListParams";

const PAGE_SIZE = 50;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ groupId: string }>;
}): Promise<Metadata> {
  try {
    const { groupId } = await params;
    const res = await serverApiFetch(`${API_ROUTES.GROUPS}/${groupId}`, undefined, {
      next: { tags: ["groups"] },
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
  pagination: { totalCount: number; hasMore: boolean };
  cardPreviewContacts: Contact[];
  groupTotalCount: number;
}

async function getGroupContacts(
  groupId: string,
  filter: ContactsListFilterParams,
): Promise<GroupContactsResponse> {
  try {
    const params = new URLSearchParams();
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", "0");
    if (filter.search) params.set("search", filter.search);
    params.set("sort", filter.sort);
    appendAvatarParams(params, "small");

    // Preview contacts for the group card avatar — always unfiltered so the
    // avatars stay stable regardless of what the user searches in the table.
    const previewParams = new URLSearchParams();
    previewParams.set("limit", "3");
    previewParams.set("offset", "0");
    appendAvatarParams(previewParams, "small");

    // Fire all three requests in parallel — they are independent
    const [res, groupRes, previewRes] = await Promise.all([
      serverApiFetch(`${API_ROUTES.GROUPS}/${groupId}/contacts?${params.toString()}`, undefined, {
        next: { tags: ["groups", "contacts"] },
      }),
      serverApiFetch(`${API_ROUTES.GROUPS}/${groupId}`, undefined, { next: { tags: ["groups"] } }),
      serverApiFetch(
        `${API_ROUTES.GROUPS}/${groupId}/contacts?${previewParams.toString()}`,
        undefined,
        { next: { tags: ["groups", "contacts"] } },
      ),
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

    const cardPreviewContacts = (previewData.contacts ?? []).map((contact: Contact) => ({
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
      pagination: data.pagination ?? {
        totalCount: contacts.length,
        hasMore: false,
      },
      cardPreviewContacts,
      // Real group member count — always unfiltered, used for the group card
      groupTotalCount: previewData.pagination?.totalCount ?? data.pagination?.totalCount ?? contacts.length,
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
  searchParams: Promise<{ search?: string; sort?: string }>;
}) {
  const { groupId } = await params;
  const { search, sort } = await searchParams;

  const filter = parseContactsListParams({ search, sort });

  const { group, contacts, pagination, cardPreviewContacts, groupTotalCount } =
    await getGroupContacts(groupId, filter);

  return (
    <GroupDetailClient
      groupId={groupId}
      groupLabel={group.label}
      groupEmoji={group.emoji || ""}
      groupColor={group.color || ""}
      initialContacts={contacts}
      totalCount={pagination.totalCount}
      initialSearch={filter.search ?? ""}
      initialSort={filter.sort}
      cardPreviewContacts={cardPreviewContacts}
      groupTotalCount={groupTotalCount}
    />
  );
}
