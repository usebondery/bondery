import type { ContactPreview, Group, GroupWithCount } from "@bondery/schemas";
import type { AvatarTransformQuery } from "@bondery/schemas/http";
import type { Database } from "@bondery/schemas/supabase.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { extractAvatarOptions, GROUP_SELECT } from "../../lib/data/select-fragments.js";
import { resolveContactAvatarUrl } from "../../lib/data/supabase.js";
import { internal, notFound } from "../../lib/platform/errors/http-errors.js";

export type PreviewListQuery = AvatarTransformQuery & {
  previewLimit?: number | string;
};

export async function listGroups(
  client: SupabaseClient<Database>,
  userId: string,
  query?: PreviewListQuery,
) {
  const previewLimitRaw = query?.previewLimit;
  const previewLimit = previewLimitRaw ? Number(previewLimitRaw) : undefined;
  const includePreview = Number.isFinite(previewLimit) && (previewLimit as number) > 0;
  const avatarOptions = extractAvatarOptions(query ?? {});

  const { data: groups, error: groupsError } = await client
    .from("groups")
    .select(GROUP_SELECT)
    .order("label", { ascending: true });

  if (groupsError) {
    throw internal("internal_server_error", groupsError.message);
  }

  const { data: memberships, error: countsError } = await client
    .from("people_groups")
    .select("group_id, person_id");

  if (countsError) {
    throw internal("internal_server_error", countsError.message);
  }

  const countMap = new Map<string, number>();
  const previewMap = new Map<string, string[]>();

  memberships?.forEach((item) => {
    const current = countMap.get(item.group_id) || 0;
    countMap.set(item.group_id, current + 1);

    if (!includePreview) {
      return;
    }

    const existing = previewMap.get(item.group_id) || [];
    if (existing.length < (previewLimit as number)) {
      existing.push(item.person_id);
      previewMap.set(item.group_id, existing);
    }
  });

  let previewContactsById = new Map<string, ContactPreview>();

  if (includePreview) {
    const previewIds = Array.from(new Set(Array.from(previewMap.values()).flat()));

    if (previewIds.length > 0) {
      const { data: previewContacts, error: previewError } = await client
        .from("people")
        .select(
          `id, firstName:first_name, lastName:last_name, updatedAt:updated_at, hasAvatar:has_avatar`,
        )
        .in("id", previewIds)
        .eq("myself", false);

      if (previewError) {
        throw internal("internal_server_error", previewError.message);
      }

      previewContactsById = new Map(
        (previewContacts || []).map((contact) => [
          contact.id,
          {
            ...contact,
            avatar: resolveContactAvatarUrl(
              client,
              userId,
              {
                hasAvatar: contact.hasAvatar,
                id: contact.id,
                updatedAt: contact.updatedAt,
              },
              avatarOptions,
            ),
          } as ContactPreview,
        ]),
      );
    }
  }

  const groupsWithCounts: GroupWithCount[] = (groups || []).map((group) => {
    const baseGroup = group as unknown as Group;
    const previewIds = includePreview ? previewMap.get(group.id) || [] : [];
    const previewContacts = includePreview
      ? (previewIds.map((id) => previewContactsById.get(id)).filter(Boolean) as ContactPreview[])
      : undefined;

    return {
      ...baseGroup,
      contactCount: countMap.get(group.id) || 0,
      previewContacts,
    };
  });

  return {
    groups: groupsWithCounts,
    totalCount: groupsWithCounts.length,
  };
}

export async function getGroup(client: SupabaseClient<Database>, userId: string, groupId: string) {
  const { data: group, error } = await client
    .from("groups")
    .select(GROUP_SELECT)
    .eq("id", groupId)
    .eq("user_id", userId)
    .single();

  if (error) {
    throw notFound("Group not found", "not_found");
  }

  return { group };
}
