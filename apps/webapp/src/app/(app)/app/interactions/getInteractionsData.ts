import { serverApiFetch } from "@/lib/api/server";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { Activity, Contact } from "@bondery/schemas";
import { buildAvatarQueryString } from "@/lib/avatarParams";

interface InteractionsDataResult {
  contacts: Contact[];
  activities: Activity[];
}

/**
 * Fetches contacts and interactions for interaction-based views.
 *
 * @returns contacts and interactions with resilient empty fallback on errors.
 */
export async function getInteractionsData(): Promise<InteractionsDataResult> {
  try {
    const contactsRes = await serverApiFetch(
      `${API_ROUTES.CONTACTS}?limit=200&offset=0&${buildAvatarQueryString("small")}`,
      undefined,
      { next: { tags: ["contacts"] } },
    );

    const interactionsRes = await serverApiFetch(
      `${API_ROUTES.INTERACTIONS}?limit=50&offset=0&${buildAvatarQueryString("medium")}`,
      undefined,
      { next: { tags: ["interactions"] } },
    );

    if (!contactsRes.ok) {
      throw new Error(`Failed to fetch contacts: ${contactsRes.status}`);
    }

    if (!interactionsRes.ok) {
      if (interactionsRes.status === 404) {
        const contactsOnly = await contactsRes.json();
        return {
          contacts: (contactsOnly.contacts || []) as Contact[],
          activities: [],
        };
      }

      throw new Error(`Failed to fetch interactions: ${interactionsRes.status}`);
    }

    const contactsData = await contactsRes.json();
    const interactionsData = await interactionsRes.json();

    return {
      contacts: (contactsData.contacts || []) as Contact[],
      activities: (interactionsData.interactions || []) as Activity[],
    };
  } catch (error) {
    console.error("Error fetching interactions data:", error);
    return { contacts: [], activities: [] };
  }
}
