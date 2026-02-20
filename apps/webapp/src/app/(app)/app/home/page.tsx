import { API_URL } from "@/lib/config";
import { getAuthHeaders } from "@/lib/authHeaders";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { UpcomingReminder } from "@bondery/types";
import { getContactsData } from "../people/getContactsData";
import { getTimelineData } from "../timeline/getTimelineData";
import { HomeClient } from "./HomeClient";

async function getUpcomingReminders(): Promise<UpcomingReminder[]> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}${API_ROUTES.CONTACTS_UPCOMING_REMINDERS}`, {
      next: { tags: ["reminders", "contacts"] },
      headers,
    });

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
  const [{ stats }, { contacts, activities }, reminders] = await Promise.all([
    getContactsData(undefined, undefined, 1, 0),
    getTimelineData(),
    getUpcomingReminders(),
  ]);

  return (
    <HomeClient
      stats={stats}
      reminders={reminders}
      timelineContacts={contacts}
      timelineActivities={activities}
    />
  );
}
