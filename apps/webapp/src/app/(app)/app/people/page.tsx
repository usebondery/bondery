import { PeopleClient } from "./PeopleClient";
import { API_URL } from "@/lib/config";
import type { Contact } from "@bondery/types";
import { getAuthHeaders } from "@/lib/authHeaders";
import { API_ROUTES } from "@bondery/helpers";

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
    const res = await fetch(`${API_URL}${API_ROUTES.CONTACTS}`, {
      cache: "no-store",
      headers,
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch contacts: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();

    // Ensure lastInteraction is a Date object
    let contacts = data.contacts.map((contact: Contact) => ({
      ...contact,
      lastInteraction: contact.lastInteraction ? new Date(contact.lastInteraction) : null,
      createdAt: contact.createdAt ? new Date(contact.createdAt) : null,
    }));

    // Server-side filtering
    if (query) {
      const lowerQuery = query.toLowerCase();
      contacts = contacts.filter((contact: Contact) =>
        `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(lowerQuery),
      );
    }

    // Server-side sorting
    if (sort) {
      contacts.sort((a: Contact, b: Contact) => {
        switch (sort) {
          case "nameAsc":
            return a.firstName.localeCompare(b.firstName);
          case "nameDesc":
            return b.firstName.localeCompare(a.firstName);
          case "surnameAsc":
            return (a.lastName || "").localeCompare(b.lastName || "");
          case "surnameDesc":
            return (b.lastName || "").localeCompare(a.lastName || "");
          case "interactionAsc":
            return (
              (a.lastInteraction ? new Date(a.lastInteraction).getTime() : 0) -
              (b.lastInteraction ? new Date(b.lastInteraction).getTime() : 0)
            );
          case "interactionDesc":
            return (
              (b.lastInteraction ? new Date(b.lastInteraction).getTime() : 0) -
              (a.lastInteraction ? new Date(a.lastInteraction).getTime() : 0)
            );
          default:
            return 0;
        }
      });
    } else {
      // Default sort
      contacts.sort((a: Contact, b: Contact) => a.firstName.localeCompare(b.firstName));
    }

    return { contacts, totalCount: contacts.length };
  } catch (error) {
    console.error("Error fetching contacts:", error);
    throw new Error(
      error instanceof Error
        ? error.message
        : "An unexpected error occurred while fetching contacts",
    );
  }
}

function calculateStats(contacts: Contact[]) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Total contacts
  const totalContacts = contacts.length;

  // This month's interactions (contacts with lastInteraction in current month)
  const thisMonthInteractions = contacts.filter((contact) => {
    if (!contact.lastInteraction) return false;
    const date = new Date(contact.lastInteraction);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  }).length;

  // New contacts this year (contacts created in current year)
  const newContactsThisYear = contacts.filter((contact) => {
    if (!contact.createdAt) return false;
    const date = new Date(contact.createdAt);
    return date.getFullYear() === currentYear;
  }).length;

  return {
    totalContacts,
    thisMonthInteractions,
    newContactsThisYear,
  };
}

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const query = params.q;
  const sort = params.sort as SortOrder | undefined;

  const { contacts, totalCount } = await getContacts(query, sort);
  const stats = calculateStats(contacts);

  return <PeopleClient initialContacts={contacts} totalCount={totalCount} stats={stats} />;
}
