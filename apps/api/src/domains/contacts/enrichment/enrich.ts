import { cleanPersonName } from "@bondery/helpers/name";
import type {
  ScrapedEducationEntry,
  ScrapedWorkHistoryEntry,
  TablesUpdate,
} from "@bondery/schemas";
import {
  toPostgresDate,
  updateContactPhoto,
  uploadAllLinkedInLogos,
} from "../../../lib/import/linkedin-helpers.js";
import { cachedGeocodeLinkedInLocation } from "../../../lib/integrations/mapy.js";
import { internal } from "../../../lib/platform/errors/http-errors.js";
import { type DomainContext, DomainError } from "../../_shared/context.js";

export interface EnrichContactInput {
  educationHistory?: ScrapedEducationEntry[];
  firstName?: string;
  headline?: string;
  lastName?: string | null;
  linkedinBio?: string | null;
  location?: string;
  middleName?: string | null;
  profileImageUrl?: string;
  workHistory?: ScrapedWorkHistoryEntry[];
}

export async function enrichContact(
  ctx: DomainContext,
  personId: string,
  input: EnrichContactInput,
): Promise<{ success: true }> {
  const { client, user, log } = ctx;
  const {
    firstName,
    middleName,
    lastName,
    profileImageUrl,
    headline,
    location,
    linkedinBio,
    workHistory,
    educationHistory,
  } = input;

  log?.info(
    {
      educationCount: educationHistory?.length ?? 0,
      personId,
      userId: user.id,
      workHistoryCount: workHistory?.length ?? 0,
    },
    "[enrich] POST received",
  );

  const { data: person, error: personError } = await client
    .from("people")
    .select("id, headline, location")
    .eq("id", personId)
    .eq("user_id", user.id)
    .single();

  if (personError || !person) {
    throw new DomainError("Contact not found", 404, "contact_not_found");
  }

  await uploadAllLinkedInLogos(client, user.id, workHistory, educationHistory);

  if (profileImageUrl) {
    await updateContactPhoto(client, personId, user.id, profileImageUrl);
  }

  const fieldUpdates: TablesUpdate<"people"> = {};

  if (profileImageUrl) {
    fieldUpdates.updated_at = new Date().toISOString();
  }
  if (firstName !== undefined) {
    fieldUpdates.first_name = cleanPersonName(firstName) || undefined;
  }
  if (middleName !== undefined) {
    fieldUpdates.middle_name = cleanPersonName(middleName) || null;
  }
  if (lastName !== undefined) {
    fieldUpdates.last_name = cleanPersonName(lastName) || null;
  }

  if (headline && !person.headline) {
    fieldUpdates.headline = headline;
  }

  if (location) {
    fieldUpdates.location = location;
    try {
      const result = await cachedGeocodeLinkedInLocation(location);
      if (result) {
        const { geo, timezone: tz } = result;
        if (geo.formattedLabel) {
          fieldUpdates.location = geo.formattedLabel;
        }
        fieldUpdates.gis_point = geo.locationEwkt;
        if (tz) {
          fieldUpdates.timezone = tz;
        }
      }
    } catch (err) {
      log?.error({ err }, "[enrich] Geocode failed, continuing without coordinates");
    }
  }

  if (Object.keys(fieldUpdates).length > 0) {
    fieldUpdates.updated_at = new Date().toISOString();
    await client.from("people").update(fieldUpdates).eq("id", personId);
  }

  const { data: linkedinRow, error: linkedinUpsertError } = await client
    .from("people_linkedin")
    .upsert(
      {
        bio: linkedinBio ?? null,
        person_id: personId,
        updated_at: new Date().toISOString(),
        user_id: user.id,
      },
      { onConflict: "user_id,person_id" },
    )
    .select("id")
    .single();

  if (linkedinUpsertError || !linkedinRow) {
    log?.error({ linkedinUpsertError }, "[enrich] Failed to upsert people_linkedin");
    throw internal("contact_enrich_failed_to_save_linkedin_profile_data");
  }

  const peopleLinkedinId = linkedinRow.id;

  if (workHistory && workHistory.length > 0) {
    const rows = workHistory.map((entry) => ({
      company_linkedin_id: entry.companyLinkedinId ?? null,
      company_name: entry.companyName,
      description: entry.description ?? null,
      employment_type: entry.employmentType ?? null,
      end_date: toPostgresDate(entry.endDate),
      location: entry.location ?? null,
      start_date: toPostgresDate(entry.startDate),
      title: entry.title ?? null,
    }));
    const { error: whError } = await client.rpc("replace_work_history", {
      p_people_linkedin_id: peopleLinkedinId,
      p_rows: rows,
      p_user_id: user.id,
    });
    if (whError) {
      log?.error({ whError }, "[enrich] Failed to replace work history");
    }
  }

  if (educationHistory && educationHistory.length > 0) {
    const rows = educationHistory.map((entry) => ({
      degree: entry.degree ?? null,
      description: entry.description ?? null,
      end_date: toPostgresDate(entry.endDate),
      school_linkedin_id: entry.schoolLinkedinId ?? null,
      school_name: entry.schoolName,
      start_date: toPostgresDate(entry.startDate),
    }));
    const { error: ehError } = await client.rpc("replace_education_history", {
      p_people_linkedin_id: peopleLinkedinId,
      p_rows: rows,
      p_user_id: user.id,
    });
    if (ehError) {
      log?.error({ ehError }, "[enrich] Failed to replace education history");
    }
  }

  log?.info({ personId }, "[enrich] Enrichment complete");
  return { success: true };
}
