import { GroupsClient } from "./GroupsClient";
import { API_URL } from "@/lib/config";
import type { GroupWithCount } from "@bondery/types";
import { getAuthHeaders } from "@/lib/authHeaders";
import { API_ROUTES } from "@bondery/helpers/globals/paths";

async function getGroups() {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}${API_ROUTES.GROUPS}?previewLimit=3`, {
      next: { tags: ["groups"] },
      headers,
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch groups: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return { groups: data.groups as GroupWithCount[], totalCount: data.totalCount };
  } catch (error) {
    console.error("Error fetching groups:", error);
    throw new Error(
      error instanceof Error ? error.message : "An unexpected error occurred while fetching groups",
    );
  }
}

export default async function GroupsPage() {
  const { groups, totalCount } = await getGroups();

  return <GroupsClient initialGroups={groups} totalCount={totalCount} />;
}
