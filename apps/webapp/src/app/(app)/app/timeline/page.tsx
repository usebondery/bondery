import { TimelineClient } from "./TimelineClient";
import { API_URL } from "@/lib/config";
import type { Contact, Activity } from "@bondery/types";
import { getAuthHeaders } from "@/lib/authHeaders";
import { API_ROUTES } from "@bondery/helpers/globals/paths";

async function getData() {
  try {
    const headers = await getAuthHeaders();
    
    // Fetch contacts for the modal dropdown
    const contactsRes = await fetch(`${API_URL}${API_ROUTES.CONTACTS}`, {
      cache: "no-store",
      headers,
    });

    // Fetch activities for the timeline
    const activitiesRes = await fetch(`${API_URL}${API_ROUTES.ACTIVITIES}`, {
      cache: "no-store",
      headers,
    });

    if (!contactsRes.ok) {
      throw new Error(`Failed to fetch contacts: ${contactsRes.status}`);
    }
    
    if (!activitiesRes.ok) {
       // If activities endpoint doesn't exist yet (deployment lag), return empty
       if (activitiesRes.status === 404) {
         return { contacts: (await contactsRes.json()).contacts, activities: [] };
       }
       throw new Error(`Failed to fetch activities: ${activitiesRes.status}`);
    }

    const contactsData = await contactsRes.json();
    const activitiesData = await activitiesRes.json();

    const contacts = contactsData.contacts;
    const activities = activitiesData.activities;

    return { contacts, activities };
  } catch (error) {
    console.error("Error fetching timeline data:", error);
    // Fallback to empty states if error
    return { contacts: [], activities: [] };
  }
}

export default async function TimelinePage() {
  const { contacts, activities } = await getData();

  return <TimelineClient initialContacts={contacts} initialActivities={activities} />;
}
