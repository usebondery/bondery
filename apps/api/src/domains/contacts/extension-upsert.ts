import { cleanPersonName } from "@bondery/helpers/name";
import type {
  ScrapedEducationEntry,
  ScrapedWorkHistoryEntry,
  UpdateContactInput,
} from "@bondery/schemas";
import { loadEnrichedContact } from "../../lib/contacts/enrichment.js";
import { findPersonIdBySocial } from "../../lib/contacts/socials.js";
import { resolveExtensionDefaultGroup, resolvePrimarySocial } from "../../lib/extension/helpers.js";
import { assignContactsToDefaultImportGroup } from "../../lib/import/default-groups.js";
import {
  updateContactPhoto,
  uploadAllLinkedInLogos,
  upsertLinkedInHistory,
} from "../../lib/import/linkedin-helpers.js";
import { internal } from "../../lib/platform/errors/http-errors.js";
import { type DomainContext, DomainError } from "../_shared/context.js";
import { domainDb } from "../_shared/domain-db.js";
import { createContact } from "./create-contact.js";
import { updateContact } from "./update-contact.js";

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

/** Fill headline/location/notes only when the stored field is empty. */
export function extensionEmptyFieldPatch(
  existing: { headline: string | null; location: string | null; notes: string | null },
  input: { headline?: string; location?: string; notes?: string },
): UpdateContactInput {
  const patch: UpdateContactInput = {};
  if (input.headline && !existing.headline) {
    patch.headline = input.headline;
  }
  if (input.location && !existing.location) {
    patch.location = input.location;
  }
  if (input.notes && !existing.notes) {
    patch.notes = input.notes;
  }
  return patch;
}

export async function upsertContactFromExtension(ctx: DomainContext, input: ExtensionUpsertInput) {
  const { user, log } = ctx;
  const db = domainDb(ctx);
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
      db,
      user.id,
      primarySocial.platform,
      primarySocial.handle,
    );
  } catch {
    throw internal("contact_failed_to_look_up_contact");
  }

  await uploadAllLinkedInLogos(user.id, workHistory, educationHistory);

  if (existingContactId) {
    const existingContact = await db.people.findFirst({
      select: {
        hasAvatar: true,
        headline: true,
        id: true,
        location: true,
        notes: true,
      },
      where: { id: existingContactId, userId: user.id },
    });

    if (!existingContact) {
      throw internal("contact_failed_to_look_up_contact");
    }

    const patch = extensionEmptyFieldPatch(existingContact, { headline, location, notes });
    if (Object.keys(patch).length > 0) {
      await updateContact(ctx, { patch, personId: existingContact.id });
    }

    if (profileImageUrl && !existingContact.hasAvatar) {
      await updateContactPhoto(existingContact.id, user.id, profileImageUrl);
    }

    await upsertLinkedInHistory(
      db,
      user.id,
      existingContact.id,
      linkedinBio,
      workHistory,
      educationHistory,
    );

    const contact = await loadEnrichedContact(db, user.id, existingContact.id, undefined, log);
    if (!contact) {
      throw internal("contact_contact_was_updated_but_could_not_be_loa");
    }

    return { contact, existed: true };
  }

  const cleanedMiddleName = cleanPersonName(middleName);
  const cleanedLastName = cleanPersonName(lastName);
  const created = await createContact(ctx, {
    firstName: cleanPersonName(firstName) || primarySocial.handle || "Unknown",
    ...(cleanedLastName ? { lastName: cleanedLastName } : {}),
    ...(cleanedMiddleName ? { middleName: cleanedMiddleName } : {}),
    ...(headline ? { headline } : {}),
    ...(location ? { location } : {}),
    ...(notes ? { notes } : {}),
    ...(primarySocial.platform === "linkedin" ? { linkedin: primarySocial.handle } : {}),
    ...(primarySocial.platform === "instagram" ? { instagram: primarySocial.handle } : {}),
    ...(primarySocial.platform === "facebook" ? { facebook: primarySocial.handle } : {}),
  });
  const newContactId = created.data.personId;

  const extensionGroup = resolveExtensionDefaultGroup(primarySocial.platform);
  if (extensionGroup) {
    try {
      await assignContactsToDefaultImportGroup(ctx, extensionGroup, [newContactId]);
    } catch {
      throw internal("contact_failed_to_assign_default_group");
    }
  }

  if (profileImageUrl) {
    await updateContactPhoto(newContactId, user.id, profileImageUrl);
  }

  if (workHistory && workHistory.length > 0) {
    log?.info(
      { count: workHistory.length, personId: newContactId },
      "[extension] Inserting work history for new contact",
    );
  }

  await upsertLinkedInHistory(
    db,
    user.id,
    newContactId,
    linkedinBio,
    workHistory,
    educationHistory,
  );

  const contact = await loadEnrichedContact(db, user.id, newContactId, undefined, log);
  if (!contact) {
    throw internal("contact_contact_was_created_but_could_not_be_loa");
  }

  return { contact, existed: false };
}
