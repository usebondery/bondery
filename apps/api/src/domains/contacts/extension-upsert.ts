import { cleanPersonName } from "@bondery/helpers/name";
import type {
  ScrapedEducationEntry,
  ScrapedWorkHistoryEntry,
  TablesInsert,
  TablesUpdate,
} from "@bondery/schemas";
import { loadEnrichedContact } from "../../lib/contacts/enrichment.js";
import { findPersonIdBySocial, upsertContactSocials } from "../../lib/contacts/socials.js";
import { resolveExtensionDefaultGroup, resolvePrimarySocial } from "../../lib/extension/helpers.js";
import { assignContactsToDefaultImportGroup } from "../../lib/import/default-groups.js";
import {
  toPostgresDate,
  updateContactPhoto,
  uploadAllLinkedInLogos,
} from "../../lib/import/linkedin-helpers.js";
import { cachedGeocodeLinkedInLocation } from "../../lib/integrations/mapy.js";
import { internal } from "../../lib/platform/errors/http-errors.js";
import { type DomainContext, DomainError } from "../_shared/context.js";

export type ExtensionUpsertInput = {
  instagram?: string;
  linkedin?: string;
  facebook?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  profileImageUrl?: string;
  headline?: string;
  location?: string;
  notes?: string;
  workHistory?: ScrapedWorkHistoryEntry[];
  educationHistory?: ScrapedEducationEntry[];
  linkedinBio?: string;
};

export async function upsertContactFromExtension(ctx: DomainContext, input: ExtensionUpsertInput) {
  const { client, user, log } = ctx;
  const {
    instagram,
    linkedin,
    facebook,
    firstName,
    middleName,
    lastName,
    profileImageUrl,
    headline,
    location,
    notes,
    workHistory,
    educationHistory,
    linkedinBio,
  } = input;

  log?.info(
    {
      handle: linkedin ?? instagram ?? facebook,
      workHistoryCount: workHistory?.length ?? 0,
    },
    "[extension] POST received",
  );

  if (!instagram && !linkedin && !facebook) {
    throw new DomainError(
      "Instagram, LinkedIn, or Facebook username is required",
      400,
      "extension_username_required",
    );
  }

  const primarySocial = resolvePrimarySocial({ facebook, instagram, linkedin });
  if (!primarySocial) {
    throw new DomainError(
      "Instagram, LinkedIn, or Facebook username is required",
      400,
      "extension_username_required",
    );
  }

  let existingContactId: string | null = null;
  try {
    existingContactId = await findPersonIdBySocial(
      client,
      user.id,
      primarySocial.platform,
      primarySocial.handle,
    );
  } catch {
    throw internal("contact_failed_to_look_up_contact");
  }

  let existingContact: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    headline: string | null;
    location: string | null;
    latitude: number | null;
    notes: string | null;
    has_avatar: boolean;
    updated_at: string | null;
  } | null = null;

  if (existingContactId) {
    const { data: contactData, error: lookupError } = await client
      .from("people")
      .select(
        "id, first_name, last_name, headline, location, latitude, notes, has_avatar, updated_at",
      )
      .eq("user_id", user.id)
      .eq("id", existingContactId)
      .single();

    if (lookupError) {
      throw internal("contact_failed_to_look_up_contact");
    }

    existingContact = contactData;
  }

  const logoMap = await uploadAllLinkedInLogos(client, user.id, workHistory, educationHistory);

  if (existingContact) {
    if (profileImageUrl && !existingContact.has_avatar) {
      await updateContactPhoto(client, existingContact.id, user.id, profileImageUrl);
    }

    const fieldUpdates: TablesUpdate<"people"> = {};
    if (headline && !existingContact.headline) {
      fieldUpdates.headline = headline;
    }
    if (location && !existingContact.location) {
      fieldUpdates.location = location;
    }
    if (notes && !existingContact.notes) {
      fieldUpdates.notes = notes;
    }

    if (location && !existingContact.location && !existingContact.latitude) {
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
        log?.error(
          { err },
          "[extension] Geocode failed for existing contact, continuing without coordinates",
        );
      }
    }

    if (Object.keys(fieldUpdates).length > 0) {
      await client.from("people").update(fieldUpdates).eq("id", existingContact.id);
    }

    if (
      (workHistory && workHistory.length > 0) ||
      (educationHistory && educationHistory.length > 0) ||
      linkedinBio
    ) {
      const { data: linkedinRow, error: linkedinUpsertError } = await client
        .from("people_linkedin")
        .upsert(
          {
            person_id: existingContact.id,
            user_id: user.id,
            ...(linkedinBio ? { bio: linkedinBio } : {}),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,person_id" },
        )
        .select("id")
        .single();

      if (linkedinUpsertError || !linkedinRow) {
        log?.error(
          { err: linkedinUpsertError },
          "[extension] Failed to upsert people_linkedin for existing contact",
        );
      } else {
        if (workHistory && workHistory.length > 0) {
          await client
            .from("people_work_history")
            .delete()
            .eq("people_linkedin_id", linkedinRow.id)
            .eq("user_id", user.id);

          const rows = workHistory.map((entry) => ({
            company_linkedin_id: entry.companyLinkedinId ?? null,
            company_name: entry.companyName,
            description: entry.description ?? null,
            employment_type: entry.employmentType ?? null,
            end_date: toPostgresDate(entry.endDate),
            location: entry.location ?? null,
            people_linkedin_id: linkedinRow.id,
            start_date: toPostgresDate(entry.startDate),
            title: entry.title ?? null,
            user_id: user.id,
          }));
          const { error: whError } = await client.from("people_work_history").insert(rows);
          if (whError) {
            log?.error(
              { err: whError },
              "[extension] Failed to insert work history for existing contact",
            );
          }
        }

        if (educationHistory && educationHistory.length > 0) {
          await client
            .from("people_education_history")
            .delete()
            .eq("people_linkedin_id", linkedinRow.id)
            .eq("user_id", user.id);

          const rows = educationHistory.map((entry) => ({
            degree: entry.degree ?? null,
            description: entry.description ?? null,
            end_date: toPostgresDate(entry.endDate),
            people_linkedin_id: linkedinRow.id,
            school_linkedin_id: entry.schoolLinkedinId ?? null,
            school_name: entry.schoolName,
            start_date: toPostgresDate(entry.startDate),
            user_id: user.id,
          }));
          const { error: ehError } = await client.from("people_education_history").insert(rows);
          if (ehError) {
            log?.error(
              { err: ehError },
              "[extension] Failed to insert education for existing contact",
            );
          }
        }
      }
    }

    const contact = await loadEnrichedContact(client, user.id, existingContact.id, undefined, log);
    if (!contact) {
      throw internal("contact_contact_was_updated_but_could_not_be_loa");
    }

    return { contact, existed: true };
  }

  const insertData: Record<string, unknown> = {
    created_at: new Date().toISOString(),
    first_name: cleanPersonName(firstName) || primarySocial.handle || "Unknown",
    updated_at: new Date().toISOString(),
    user_id: user.id,
  };

  const cleanedMiddleName = cleanPersonName(middleName);
  const cleanedLastName = cleanPersonName(lastName);
  if (cleanedMiddleName) {
    insertData.middle_name = cleanedMiddleName;
  }
  if (cleanedLastName) {
    insertData.last_name = cleanedLastName;
  }
  if (headline) {
    insertData.headline = headline;
  }
  if (location) {
    insertData.location = location;
  }
  if (notes) {
    insertData.notes = notes;
  }

  if (location) {
    try {
      const result = await cachedGeocodeLinkedInLocation(location);
      if (result) {
        const { geo, timezone: tz } = result;
        if (geo.formattedLabel) {
          insertData.location = geo.formattedLabel;
        }
        insertData.gis_point = geo.locationEwkt;
        if (tz) {
          insertData.timezone = tz;
        }
      }
    } catch (err) {
      log?.error(
        { err },
        "[extension] Geocode failed for new contact, continuing without coordinates",
      );
    }
  }

  const { data: newContact, error: createError } = await client
    .from("people")
    .insert(insertData as TablesInsert<"people">)
    .select("id")
    .single();

  if (createError || !newContact) {
    log?.error({ err: createError }, "[extension] Failed to create contact");
    throw internal("contact_failed_to_create_contact");
  }

  try {
    await upsertContactSocials(
      client,
      user.id,
      newContact.id,
      primarySocial.platform,
      primarySocial.handle,
    );
  } catch {
    throw internal("contact_failed_to_save_socials");
  }

  const extensionGroup = resolveExtensionDefaultGroup(primarySocial.platform);
  if (extensionGroup) {
    try {
      await assignContactsToDefaultImportGroup(client, user.id, extensionGroup, [newContact.id]);
    } catch {
      throw internal("contact_failed_to_assign_default_group");
    }
  }

  if (profileImageUrl) {
    await updateContactPhoto(client, newContact.id, user.id, profileImageUrl);
  }

  if (
    (workHistory && workHistory.length > 0) ||
    (educationHistory && educationHistory.length > 0) ||
    linkedinBio
  ) {
    const { data: linkedinRow, error: linkedinInsertError } = await client
      .from("people_linkedin")
      .insert({
        bio: linkedinBio ?? null,
        person_id: newContact.id,
        user_id: user.id,
      })
      .select("id")
      .single();

    if (linkedinInsertError || !linkedinRow) {
      log?.error(
        { err: linkedinInsertError },
        "[extension] Failed to insert people_linkedin for new contact",
      );
    } else {
      if (workHistory && workHistory.length > 0) {
        log?.info(
          { count: workHistory.length, personId: newContact.id },
          "[extension] Inserting work history for new contact",
        );
        const rows = workHistory.map((entry) => ({
          company_linkedin_id: entry.companyLinkedinId ?? null,
          company_name: entry.companyName,
          description: entry.description ?? null,
          employment_type: entry.employmentType ?? null,
          end_date: toPostgresDate(entry.endDate),
          location: entry.location ?? null,
          people_linkedin_id: linkedinRow.id,
          start_date: toPostgresDate(entry.startDate),
          title: entry.title ?? null,
          user_id: user.id,
        }));
        const { error: whError } = await client.from("people_work_history").insert(rows);
        if (whError) {
          log?.error({ err: whError }, "[extension] Failed to insert work history");
        }
      }

      if (educationHistory && educationHistory.length > 0) {
        const rows = educationHistory.map((entry) => ({
          degree: entry.degree ?? null,
          description: entry.description ?? null,
          end_date: toPostgresDate(entry.endDate),
          people_linkedin_id: linkedinRow.id,
          school_linkedin_id: entry.schoolLinkedinId ?? null,
          school_name: entry.schoolName,
          start_date: toPostgresDate(entry.startDate),
          user_id: user.id,
        }));
        const { error: ehError } = await client.from("people_education_history").insert(rows);
        if (ehError) {
          log?.error({ err: ehError }, "[extension] Failed to insert education");
        }
      }
    }
  }

  void logoMap;

  const contact = await loadEnrichedContact(client, user.id, newContact.id, undefined, log);
  if (!contact) {
    throw internal("contact_contact_was_created_but_could_not_be_loa");
  }

  return { contact, existed: false };
}
