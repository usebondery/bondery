import type { Metadata } from "next";
import { API_URL } from "@/lib/config";
import { getAuthHeaders } from "@/lib/authHeaders";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { UpcomingReminder } from "@bondery/types";
import { buildAvatarQueryString } from "@/lib/avatarParams";
import { getContactsData } from "../people/getContactsData";
import { getInteractionsData } from "../interactions/getInteractionsData";
import { HomeClient } from "./HomeClient";

export const metadata: Metadata = { title: "Home" };

async function getUpcomingReminders(): Promise<UpcomingReminder[]> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_URL}${API_ROUTES.CONTACTS_UPCOMING_REMINDERS}?${buildAvatarQueryString("medium")}`,
      {
        next: { tags: ["reminders", "contacts"] },
        headers,
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch upcoming reminders: ${response.status}`);
    }

    const data = await response.json();
    return (data.reminders || []) as UpcomingReminder[];
  } catch (error) {
    console.error("Error fetching upcoming reminders:", error);
    return [];
  }
}

export default async function HomePage() {
  const [
    { stats },
    { contacts, activities },
    reminders,
    { contacts: recentlyAdded },
    { contacts: recentlyInteracted },
  ] = await Promise.all([
    getContactsData(undefined, undefined, 1, 0),
    getInteractionsData(),
    getUpcomingReminders(),
    getContactsData(undefined, "createdAtDesc", 5, 0, "small"),
    getContactsData(undefined, "interactionDesc", 5, 0, "small"),
  ]);

  return (
    <HomeClient
      stats={stats}
      reminders={reminders}
      timelineContacts={contacts}
      timelineActivities={activities}
      recentlyAdded={recentlyAdded}
      recentlyInteracted={recentlyInteracted}
    />
  );
}
