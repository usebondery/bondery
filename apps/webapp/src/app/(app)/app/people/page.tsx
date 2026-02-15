import { PeopleClient } from "./PeopleClient";
import { API_URL } from "@/lib/config";
import type { Contact } from "@bondery/types";
import { getAuthHeaders } from "@/lib/authHeaders";
import { API_ROUTES } from "@bondery/helpers/globals/paths";

type SortOrder =
  | "nameAsc"
  | "nameDesc"
  | "surnameAsc"
  | "surnameDesc"
  | "interactionAsc"
  | "interactionDesc";

async function getContacts(query?: string, sort?: SortOrder) {
  try {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    params.set("limit", "50");
    params.set("offset", "0");
    if (query) {
      params.set("q", query);
    }
    if (sort) {
      params.set("sort", sort);
    }

    const res = await fetch(`${API_URL}${API_ROUTES.CONTACTS}?${params.toString()}`, {
      cache: "no-store",
      headers,
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch contacts: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();

    return {
      contacts: (data.contacts || []) as Contact[],
      totalCount: Number.isFinite(data.totalCount) ? data.totalCount : (data.contacts || []).length,
      stats: {
        totalContacts: data?.stats?.totalContacts ?? data.totalCount ?? 0,
        thisMonthInteractions: data?.stats?.thisMonthInteractions ?? 0,
        newContactsThisYear: data?.stats?.newContactsThisYear ?? 0,
      },
    };
  } catch (error) {
    console.error("Error fetching contacts:", error);
    throw new Error(
      error instanceof Error
        ? error.message
        : "An unexpected error occurred while fetching contacts",
    );
  }
}

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const query = params.q;
  const sort = params.sort as SortOrder | undefined;

  const { contacts, totalCount, stats } = await getContacts(query, sort);

  return <PeopleClient initialContacts={contacts} totalCount={totalCount} stats={stats} />;
}
