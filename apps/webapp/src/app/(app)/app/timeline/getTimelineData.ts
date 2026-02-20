import { API_URL } from "@/lib/config";
import { getAuthHeaders } from "@/lib/authHeaders";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { Activity, Contact } from "@bondery/types";

interface TimelineDataResult {
  contacts: Contact[];
  activities: Activity[];
}

/**
 * Fetches contacts and timeline events for timeline-based views.
 *
 * @returns Timeline contacts and events with resilient empty fallback on errors.
 */
export async function getTimelineData(): Promise<TimelineDataResult> {
  try {
    const headers = await getAuthHeaders();

    const contactsRes = await fetch(`${API_URL}${API_ROUTES.CONTACTS}`, {
      next: { tags: ["contacts"] },
      headers,
    });

    const eventsRes = await fetch(`${API_URL}${API_ROUTES.EVENTS}`, {
      next: { tags: ["events"] },
      headers,
    });

    if (!contactsRes.ok) {
      throw new Error(`Failed to fetch contacts: ${contactsRes.status}`);
    }

    if (!eventsRes.ok) {
      if (eventsRes.status === 404) {
        const contactsOnly = await contactsRes.json();
        return {
          contacts: (contactsOnly.contacts || []) as Contact[],
          activities: [],
        };
      }

      throw new Error(`Failed to fetch events: ${eventsRes.status}`);
    }

    const contactsData = await contactsRes.json();
    const eventsData = await eventsRes.json();

    return {
      contacts: (contactsData.contacts || []) as Contact[],
      activities: (eventsData.events || []) as Activity[],
    };
  } catch (error) {
    console.error("Error fetching timeline data:", error);
    return { contacts: [], activities: [] };
  }
}
