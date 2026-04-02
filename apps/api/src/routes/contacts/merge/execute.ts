/**
 * Contacts — Merge Execute Route
 * POST /merge: merges two duplicate contacts, left person absorbs right.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getAuth } from "../../../lib/auth.js";
import { replaceContactPhones, replaceContactEmails } from "../channels.js";
import { upsertContactSocials } from "../../../lib/socials.js";
import type {
  EmailEntry,
  PhoneEntry,
  MergeContactsResponse,
  MergeConflictField,
  MergeConflictChoice,
} from "@bondery/types";
import {
  MERGEABLE_FIELDS,
  MERGEABLE_SCALAR_FIELDS,
  MERGEABLE_SOCIAL_FIELDS,
  MergeContactsBody,
  normalizePhoneSet,
  normalizeEmailSet,
  normalizeImportantDateSet,
  hasMeaningfulValue,
  areValuesEquivalent,
  resolveConflictChoice,
} from "./helpers.js";

// Suppress unused import warning — upsertContactSocials kept for future social upsert path
void upsertContactSocials;

export function registerMergeExecuteRoute(fastify: FastifyInstance): void {
  /**
   * POST /api/contacts/merge - Merge duplicate contacts
   * Left person survives and absorbs data from right person.
   */
  fastify.post(
    "/merge",
    { schema: { body: MergeContactsBody } },
    async (
      request: FastifyRequest<{ Body: typeof MergeContactsBody.static }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);
      const leftPersonId = request.body.leftPersonId.trim();
      const rightPersonId = request.body.rightPersonId.trim();
      const conflictResolutions = request.body.conflictResolutions || {};

      if (leftPersonId === rightPersonId) {
        return reply.status(400).send({ error: "Cannot merge the same contact" });
      }

      for (const [field, choice] of Object.entries(conflictResolutions)) {
        if (!MERGEABLE_FIELDS.has(field as MergeConflictField)) {
          return reply.status(400).send({ error: `Unsupported conflict field: ${field}` });
        }

        if (choice !== "left" && choice !== "right") {
          return reply.status(400).send({ error: `Invalid conflict choice for field: ${field}` });
        }
      }

      const { data: peopleRows, error: peopleError } = await client
        .from("people")
        .select("*")
        .eq("user_id", user.id)
        .in("id", [leftPersonId, rightPersonId]);

      if (peopleError) {
        return reply.status(500).send({ error: peopleError.message });
      }

      if (!peopleRows || peopleRows.length !== 2) {
        return reply.status(404).send({ error: "One or both contacts were not found" });
      }

      const leftPerson = peopleRows.find((person) => person.id === leftPersonId);
      const rightPerson = peopleRows.find((person) => person.id === rightPersonId);

      if (!leftPerson || !rightPerson) {
        return reply.status(404).send({ error: "One or both contacts were not found" });
      }

      const scalarUpdates: Record<string, unknown> = {};

      for (const [field, dbColumn] of Object.entries(MERGEABLE_SCALAR_FIELDS)) {
        const mergeField = field as MergeConflictField;
        const leftValue = (leftPerson as Record<string, unknown>)[dbColumn];
        const rightValue = (rightPerson as Record<string, unknown>)[dbColumn];

        if (!hasMeaningfulValue(rightValue)) {
          continue;
        }

        if (!hasMeaningfulValue(leftValue)) {
          scalarUpdates[dbColumn] = rightValue;
          continue;
        }

        if (areValuesEquivalent(leftValue, rightValue)) {
          continue;
        }

        if (
          resolveConflictChoice(
            conflictResolutions as Partial<Record<MergeConflictField, MergeConflictChoice>>,
            mergeField,
          ) === "right"
        ) {
          scalarUpdates[dbColumn] = rightValue;
        }
      }

      scalarUpdates.updated_at = new Date().toISOString();

      const { error: updateLeftPersonError } = await client
        .from("people")
        .update(scalarUpdates)
        .eq("id", leftPersonId)
        .eq("user_id", user.id);

      if (updateLeftPersonError) {
        return reply.status(500).send({ error: updateLeftPersonError.message });
      }

      const [
        { data: leftPhones, error: leftPhonesError },
        { data: rightPhones, error: rightPhonesError },
      ] = await Promise.all([
        client
          .from("people_phones")
          .select("prefix, value, type, preferred")
          .eq("user_id", user.id)
          .eq("person_id", leftPersonId)
          .order("sort_order", { ascending: true }),
        client
          .from("people_phones")
          .select("prefix, value, type, preferred")
          .eq("user_id", user.id)
          .eq("person_id", rightPersonId)
          .order("sort_order", { ascending: true }),
      ]);

      if (leftPhonesError || rightPhonesError) {
        return reply
          .status(500)
          .send({ error: leftPhonesError?.message || rightPhonesError?.message });
      }

      const normalizedLeftPhones = (leftPhones || [])
        .map((phone) => ({
          prefix: phone.prefix || "+1",
          value: String(phone.value || "").trim(),
          type: phone.type || "home",
          preferred: Boolean(phone.preferred),
        }))
        .filter((phone) => phone.value.length > 0);

      const normalizedRightPhones = (rightPhones || [])
        .map((phone) => ({
          prefix: phone.prefix || "+1",
          value: String(phone.value || "").trim(),
          type: phone.type || "home",
          preferred: Boolean(phone.preferred),
        }))
        .filter((phone) => phone.value.length > 0);

      const phonesEqual =
        JSON.stringify(normalizePhoneSet(normalizedLeftPhones)) ===
        JSON.stringify(normalizePhoneSet(normalizedRightPhones));

      let mergedPhones = normalizedLeftPhones;
      if (!normalizedLeftPhones.length && normalizedRightPhones.length) {
        mergedPhones = normalizedRightPhones;
      } else if (normalizedLeftPhones.length && normalizedRightPhones.length && !phonesEqual) {
        const choice = resolveConflictChoice(
          conflictResolutions as Partial<Record<MergeConflictField, MergeConflictChoice>>,
          "phones",
        );
        mergedPhones = choice === "right" ? normalizedRightPhones : normalizedLeftPhones;
      }

      try {
        await replaceContactPhones(client, user.id, leftPersonId, mergedPhones as PhoneEntry[]);
      } catch (phoneError) {
        const message = phoneError instanceof Error ? phoneError.message : "Failed to merge phones";
        return reply.status(500).send({ error: message });
      }

      const [
        { data: leftEmails, error: leftEmailsError },
        { data: rightEmails, error: rightEmailsError },
      ] = await Promise.all([
        client
          .from("people_emails")
          .select("value, type, preferred")
          .eq("user_id", user.id)
          .eq("person_id", leftPersonId)
          .order("sort_order", { ascending: true }),
        client
          .from("people_emails")
          .select("value, type, preferred")
          .eq("user_id", user.id)
          .eq("person_id", rightPersonId)
          .order("sort_order", { ascending: true }),
      ]);

      if (leftEmailsError || rightEmailsError) {
        return reply
          .status(500)
          .send({ error: leftEmailsError?.message || rightEmailsError?.message });
      }

      const normalizedLeftEmails = (leftEmails || [])
        .map((email) => ({
          value: String(email.value || "").trim(),
          type: email.type || "home",
          preferred: Boolean(email.preferred),
        }))
        .filter((email) => email.value.length > 0);

      const normalizedRightEmails = (rightEmails || [])
        .map((email) => ({
          value: String(email.value || "").trim(),
          type: email.type || "home",
          preferred: Boolean(email.preferred),
        }))
        .filter((email) => email.value.length > 0);

      const emailsEqual =
        JSON.stringify(normalizeEmailSet(normalizedLeftEmails)) ===
        JSON.stringify(normalizeEmailSet(normalizedRightEmails));

      let mergedEmails = normalizedLeftEmails;
      if (!normalizedLeftEmails.length && normalizedRightEmails.length) {
        mergedEmails = normalizedRightEmails;
      } else if (normalizedLeftEmails.length && normalizedRightEmails.length && !emailsEqual) {
        const choice = resolveConflictChoice(
          conflictResolutions as Partial<Record<MergeConflictField, MergeConflictChoice>>,
          "emails",
        );
        mergedEmails = choice === "right" ? normalizedRightEmails : normalizedLeftEmails;
      }

      try {
        await replaceContactEmails(client, user.id, leftPersonId, mergedEmails as EmailEntry[]);
      } catch (emailError) {
        const message = emailError instanceof Error ? emailError.message : "Failed to merge emails";
        return reply.status(500).send({ error: message });
      }

      const { data: socialRows, error: socialRowsError } = await client
        .from("people_socials")
        .select("id, person_id, platform, handle, connected_at")
        .eq("user_id", user.id)
        .in("person_id", [leftPersonId, rightPersonId]);

      if (socialRowsError) {
        return reply.status(500).send({ error: socialRowsError.message });
      }

      const leftSocialByPlatform = new Map(
        (socialRows || [])
          .filter((row) => row.person_id === leftPersonId)
          .map((row) => [row.platform, row]),
      );

      const rightSocialByPlatform = new Map(
        (socialRows || [])
          .filter((row) => row.person_id === rightPersonId)
          .map((row) => [row.platform, row]),
      );

      // Batch social media writes: collect inserts and updates, then execute in parallel
      const socialInserts: Array<{
        user_id: string;
        person_id: string;
        platform: string;
        handle: string;
        connected_at: string | null;
      }> = [];
      const socialUpdatePromises: Array<PromiseLike<unknown>> = [];

      for (const [field, platform] of Object.entries(MERGEABLE_SOCIAL_FIELDS)) {
        const leftSocial = leftSocialByPlatform.get(platform);
        const rightSocial = rightSocialByPlatform.get(platform);

        if (!rightSocial || !hasMeaningfulValue(rightSocial.handle)) {
          continue;
        }

        if (!leftSocial) {
          socialInserts.push({
            user_id: user.id,
            person_id: leftPersonId,
            platform,
            handle: rightSocial.handle,
            connected_at: rightSocial.connected_at,
          });
          continue;
        }

        if (areValuesEquivalent(leftSocial.handle, rightSocial.handle)) {
          continue;
        }

        const choice = resolveConflictChoice(
          conflictResolutions as Partial<Record<MergeConflictField, MergeConflictChoice>>,
          field as MergeConflictField,
        );
        if (choice !== "right") {
          continue;
        }

        socialUpdatePromises.push(
          client
            .from("people_socials")
            .update({
              handle: rightSocial.handle,
              connected_at: rightSocial.connected_at,
              updated_at: new Date().toISOString(),
            })
            .eq("id", leftSocial.id)
            .eq("user_id", user.id),
        );
      }

      // Execute all social media writes in parallel
      const socialWriteResults = await Promise.allSettled([
        ...(socialInserts.length > 0 ? [client.from("people_socials").insert(socialInserts)] : []),
        ...socialUpdatePromises,
      ]);

      // Check for non-duplicate errors
      for (const result of socialWriteResults) {
        if (result.status === "rejected") {
          return reply
            .status(500)
            .send({ error: result.reason?.message ?? "Social media merge failed" });
        }
        if (
          result.status === "fulfilled" &&
          result.value &&
          typeof result.value === "object" &&
          "error" in result.value
        ) {
          const err = (result.value as { error: { code?: string; message: string } | null }).error;
          if (err && err.code !== "23505") {
            return reply.status(500).send({ error: err.message });
          }
        }
      }

      const { data: rightGroupMemberships, error: rightGroupMembershipsError } = await client
        .from("people_groups")
        .select("group_id")
        .eq("user_id", user.id)
        .eq("person_id", rightPersonId);

      if (rightGroupMembershipsError) {
        return reply.status(500).send({ error: rightGroupMembershipsError.message });
      }

      if ((rightGroupMemberships || []).length > 0) {
        const { error: groupMergeError } = await client.from("people_groups").upsert(
          (rightGroupMemberships || []).map((membership) => ({
            user_id: user.id,
            person_id: leftPersonId,
            group_id: membership.group_id,
          })),
          {
            onConflict: "person_id,group_id",
            ignoreDuplicates: true,
          },
        );

        if (groupMergeError) {
          return reply.status(500).send({ error: groupMergeError.message });
        }
      }

      const { data: rightParticipants, error: rightParticipantsError } = await client
        .from("interaction_participants")
        .select("interaction_id")
        .eq("person_id", rightPersonId);

      if (rightParticipantsError) {
        return reply.status(500).send({ error: rightParticipantsError.message });
      }

      if ((rightParticipants || []).length > 0) {
        const { error: participantsMergeError } = await client
          .from("interaction_participants")
          .upsert(
            (rightParticipants || []).map((participant) => ({
              interaction_id: participant.interaction_id,
              person_id: leftPersonId,
            })),
            {
              onConflict: "interaction_id,person_id",
              ignoreDuplicates: true,
            },
          );

        if (participantsMergeError) {
          return reply.status(500).send({ error: participantsMergeError.message });
        }
      }

      const [
        { data: leftImportantDates, error: leftImportantDatesError },
        { data: rightImportantDates, error: rightImportantDatesError },
      ] = await Promise.all([
        client
          .from("people_important_dates")
          .select("type, date, note, notify_days_before")
          .eq("user_id", user.id)
          .eq("person_id", leftPersonId)
          .order("created_at", { ascending: true }),
        client
          .from("people_important_dates")
          .select("type, date, note, notify_days_before")
          .eq("user_id", user.id)
          .eq("person_id", rightPersonId)
          .order("created_at", { ascending: true }),
      ]);

      if (leftImportantDatesError || rightImportantDatesError) {
        return reply
          .status(500)
          .send({ error: leftImportantDatesError?.message || rightImportantDatesError?.message });
      }

      const normalizedLeftImportantDates = (leftImportantDates || []).map((event) => ({
        type: event.type,
        date: event.date,
        note: event.note,
        notify_days_before: event.notify_days_before,
      }));

      const normalizedRightImportantDates = (rightImportantDates || []).map((event) => ({
        type: event.type,
        date: event.date,
        note: event.note,
        notify_days_before: event.notify_days_before,
      }));

      const importantDatesEqual =
        JSON.stringify(normalizeImportantDateSet(normalizedLeftImportantDates)) ===
        JSON.stringify(normalizeImportantDateSet(normalizedRightImportantDates));

      let mergedImportantDates = normalizedLeftImportantDates;
      if (!normalizedLeftImportantDates.length && normalizedRightImportantDates.length) {
        mergedImportantDates = normalizedRightImportantDates;
      } else if (
        normalizedLeftImportantDates.length &&
        normalizedRightImportantDates.length &&
        !importantDatesEqual
      ) {
        const choice = resolveConflictChoice(
          conflictResolutions as Partial<Record<MergeConflictField, MergeConflictChoice>>,
          "importantDates",
        );
        mergedImportantDates =
          choice === "right" ? normalizedRightImportantDates : normalizedLeftImportantDates;
      }

      const { error: deleteLeftImportantDatesError } = await client
        .from("people_important_dates")
        .delete()
        .eq("user_id", user.id)
        .eq("person_id", leftPersonId);

      if (deleteLeftImportantDatesError) {
        return reply.status(500).send({ error: deleteLeftImportantDatesError.message });
      }

      if (mergedImportantDates.length > 0) {
        const { error: insertImportantDatesError } = await client
          .from("people_important_dates")
          .insert(
            mergedImportantDates.map((event) => ({
              user_id: user.id,
              person_id: leftPersonId,
              type: event.type,
              date: event.date,
              note: event.note,
              notify_days_before: event.notify_days_before,
            })),
          );

        if (insertImportantDatesError) {
          return reply.status(500).send({ error: insertImportantDatesError.message });
        }
      }

      const { data: relationshipsToTransfer, error: relationshipsToTransferError } = await client
        .from("people_relationships")
        .select("relationship_type, source_person_id, target_person_id")
        .eq("user_id", user.id)
        .or(`source_person_id.eq.${rightPersonId},target_person_id.eq.${rightPersonId}`);

      if (relationshipsToTransferError) {
        return reply.status(500).send({ error: relationshipsToTransferError.message });
      }

      // Bulk insert relationship transfers instead of per-row inserts
      const relationshipRows = (relationshipsToTransfer || [])
        .map((relationship) => {
          const nextSourcePersonId =
            relationship.source_person_id === rightPersonId
              ? leftPersonId
              : relationship.source_person_id;
          const nextTargetPersonId =
            relationship.target_person_id === rightPersonId
              ? leftPersonId
              : relationship.target_person_id;

          // Filter out self-referential relationships
          if (nextSourcePersonId === nextTargetPersonId) {
            return null;
          }

          return {
            user_id: user.id,
            source_person_id: nextSourcePersonId,
            target_person_id: nextTargetPersonId,
            relationship_type: relationship.relationship_type,
          };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);

      if (relationshipRows.length > 0) {
        // Use Promise.allSettled to handle individual constraint violations gracefully
        const results = await Promise.allSettled(
          relationshipRows.map((row) => client.from("people_relationships").insert(row)),
        );

        for (const result of results) {
          if (result.status === "fulfilled" && result.value.error) {
            const err = result.value.error;
            // 23505 = unique violation, 23514 = check constraint — both are expected and skippable
            if (err.code !== "23505" && err.code !== "23514") {
              return reply.status(500).send({ error: err.message });
            }
          }
        }
      }

      const { error: deleteMergedPersonError } = await client
        .from("people")
        .delete()
        .eq("id", rightPersonId)
        .eq("user_id", user.id);

      if (deleteMergedPersonError) {
        return reply.status(500).send({ error: deleteMergedPersonError.message });
      }

      // Handle avatar conflict: copy the chosen avatar file, then clean up the right person's file
      const rightAvatarPath = `${user.id}/${rightPersonId}.jpg`;
      const leftAvatarPath = `${user.id}/${leftPersonId}.jpg`;

      if (
        resolveConflictChoice(
          conflictResolutions as Partial<Record<MergeConflictField, MergeConflictChoice>>,
          "avatar",
        ) === "right"
      ) {
        // Copy right person's avatar to left person's storage path (best-effort, tolerates missing files)
        await client.storage.from("avatars").copy(rightAvatarPath, leftAvatarPath);
      }

      // Remove the right person's avatar file regardless of choice (cleanup orphaned file)
      await client.storage.from("avatars").remove([rightAvatarPath]);

      const response: MergeContactsResponse = {
        personId: leftPersonId,
        userId: user.id,
        mergedIntoPersonId: leftPersonId,
        mergedFromPersonId: rightPersonId,
      };

      return response;
    },
  );
}
