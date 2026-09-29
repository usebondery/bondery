import type { Prisma } from "@bondery/db";
import type {
  AvatarTransformOptions,
  CreateInteractionInput,
  InteractionType,
  UpdateInteractionInput,
} from "@bondery/schemas";
import { assertOwnedPersonIds } from "../../domains/_shared/assert-owned-person-ids.js";
import {
  type DomainContext,
  DomainError,
  syncEmitMetaFromContext,
} from "../../domains/_shared/context.js";
import { domainDb } from "../../domains/_shared/domain-db.js";
import { internal } from "../../lib/platform/errors/http-errors.js";
import { buildPeopleRowChange } from "../../lib/sync/build-changes.js";
import { persistSyncChanges } from "../../lib/sync/persist-changes.js";
import { maybeCaptureActivation } from "../analytics/maybe-capture-activation.js";
import { loadFormattedInteraction } from "./format.js";

export type FormattedInteraction = NonNullable<
  Awaited<ReturnType<typeof loadFormattedInteraction>>
>;

export { loadFormattedInteraction, mapInteractionParticipant } from "./format.js";

async function requireOwnedInteraction(ctx: DomainContext, interactionId: string) {
  const db = domainDb(ctx);
  const interaction = await db.interaction.findFirst({
    select: { date: true, id: true, title: true, type: true },
    where: { id: interactionId, userId: ctx.user.id },
  });

  if (!interaction) {
    throw new DomainError("Interaction not found", 404, "interaction_not_found");
  }

  return interaction;
}

async function persistPeopleLastInteractionChanges(ctx: DomainContext, personIds: string[]) {
  const uniqueIds = [...new Set(personIds)];
  if (uniqueIds.length === 0) {
    return;
  }

  const db = domainDb(ctx);
  const changes = (
    await Promise.all(uniqueIds.map((personId) => buildPeopleRowChange(ctx.user.id, personId, db)))
  ).filter((change) => change !== null);

  if (changes.length === 0) {
    return;
  }

  await persistSyncChanges(ctx.user.id, changes, syncEmitMetaFromContext(ctx));
}

async function updateParticipantLastInteraction(
  ctx: DomainContext,
  participantIds: string[],
  interactionId: string,
  interactionDate: string,
) {
  if (participantIds.length === 0) {
    return;
  }

  const db = domainDb(ctx);
  await db.people.updateMany({
    data: {
      lastInteraction: new Date(interactionDate),
      lastInteractionActivityId: interactionId,
    },
    where: { id: { in: participantIds }, userId: ctx.user.id },
  });

  await persistPeopleLastInteractionChanges(ctx, participantIds);
}

async function syncLastInteractionForExistingParticipants(
  ctx: DomainContext,
  interactionId: string,
  interactionDate: string,
) {
  const db = domainDb(ctx);
  const participants = await db.interactionParticipant.findMany({
    select: { personId: true },
    where: { interactionId },
  });

  if (participants.length === 0) {
    return;
  }

  const personIds = participants.map((participant) => participant.personId);

  await db.people.updateMany({
    data: {
      lastInteraction: new Date(interactionDate),
      lastInteractionActivityId: interactionId,
    },
    where: {
      id: { in: personIds },
      lastInteractionActivityId: interactionId,
      userId: ctx.user.id,
    },
  });

  await persistPeopleLastInteractionChanges(ctx, personIds);
}

export async function createInteraction(
  ctx: DomainContext,
  input: CreateInteractionInput,
): Promise<FormattedInteraction> {
  const db = domainDb(ctx);
  const { user } = ctx;

  await assertOwnedPersonIds(ctx, input.participantIds ?? []);

  const interaction = await db.interaction.create({
    data: {
      date: new Date(input.date),
      description: input.description || null,
      title: input.title || null,
      type: input.type,
      userId: user.id,
    },
    select: { id: true },
  });

  if (input.participantIds && input.participantIds.length > 0) {
    await db.interactionParticipant.createMany({
      data: input.participantIds.map((personId) => ({
        interactionId: interaction.id,
        personId,
      })),
    });

    await updateParticipantLastInteraction(ctx, input.participantIds, interaction.id, input.date);
  }

  const formatted = await loadFormattedInteraction(ctx, interaction.id);
  if (!formatted) {
    throw internal("interaction_interaction_was_created_but_could_not_be");
  }

  void maybeCaptureActivation(ctx, "first_interaction");

  return formatted;
}

export async function updateInteraction(
  ctx: DomainContext,
  interactionId: string,
  input: UpdateInteractionInput,
  avatarOptions?: AvatarTransformOptions,
): Promise<FormattedInteraction> {
  const db = domainDb(ctx);
  const { user } = ctx;

  await requireOwnedInteraction(ctx, interactionId);

  if (input.participantIds) {
    await assertOwnedPersonIds(ctx, input.participantIds);
  }

  const updates: Prisma.InteractionUpdateManyMutationInput = {};
  if (input.title !== undefined) {
    updates.title = input.title;
  }
  if (input.description !== undefined) {
    updates.description = input.description;
  }
  if (input.type !== undefined) {
    updates.type = input.type;
  }
  if (input.date !== undefined) {
    updates.date = new Date(input.date);
  }

  if (Object.keys(updates).length > 0) {
    const updated = await db.interaction.updateMany({
      data: updates,
      where: { id: interactionId, userId: user.id },
    });
    if (updated.count === 0) {
      throw new DomainError("Interaction not found", 404, "interaction_not_found");
    }
  }

  if (input.participantIds) {
    await db.interactionParticipant.deleteMany({
      where: { interactionId },
    });

    if (input.participantIds.length > 0) {
      await db.interactionParticipant.createMany({
        data: input.participantIds.map((personId) => ({
          interactionId,
          personId,
        })),
      });

      if (input.date) {
        await updateParticipantLastInteraction(
          ctx,
          input.participantIds,
          interactionId,
          input.date,
        );
      }
    }
  } else if (input.date !== undefined) {
    await syncLastInteractionForExistingParticipants(ctx, interactionId, input.date);
  }

  const formatted = await loadFormattedInteraction(ctx, interactionId, avatarOptions);
  if (!formatted) {
    throw new DomainError("Interaction not found", 404, "interaction_not_found");
  }

  return formatted;
}

export async function deleteInteraction(ctx: DomainContext, interactionId: string) {
  const db = domainDb(ctx);

  await requireOwnedInteraction(ctx, interactionId);

  await db.interactionParticipant.deleteMany({
    where: { interactionId },
  });

  const deleted = await db.interaction.deleteMany({
    where: { id: interactionId, userId: ctx.user.id },
  });
  if (deleted.count === 0) {
    throw new DomainError("Interaction not found", 404, "interaction_not_found");
  }
}

export async function logInteraction(
  ctx: DomainContext,
  input: {
    title?: string;
    type: InteractionType;
    description?: string;
    date: string;
    participantIds: string[];
  },
) {
  const db = domainDb(ctx);

  const interaction = await createInteraction(ctx, {
    date: input.date,
    description: input.description,
    participantIds: input.participantIds,
    title: input.title,
    type: input.type,
  });

  const participants = await db.people.findMany({
    select: { firstName: true, lastName: true },
    where: { id: { in: input.participantIds }, userId: ctx.user.id },
  });

  const names =
    participants.map((p) => [p.firstName, p.lastName].filter(Boolean).join(" ")).join(", ") ||
    "unknown";

  return {
    date: input.date,
    id: interaction.id,
    message: `Logged ${input.type} interaction on ${input.date} with ${names}`,
    participants: names,
    type: input.type,
  };
}

export async function addParticipantsToInteraction(
  ctx: DomainContext,
  interactionId: string,
  participantIds: string[],
) {
  const db = domainDb(ctx);

  const interaction = await requireOwnedInteraction(ctx, interactionId);

  await assertOwnedPersonIds(ctx, participantIds);

  const existing = await db.interactionParticipant.findMany({
    select: { personId: true },
    where: { interactionId },
  });

  const existingIds = new Set(existing.map((p) => p.personId));
  const newIds = participantIds.filter((id) => !existingIds.has(id));

  if (newIds.length === 0) {
    return {
      message: "All specified contacts are already part of this interaction.",
    };
  }

  await db.interactionParticipant.createMany({
    data: newIds.map((personId) => ({
      interactionId,
      personId,
    })),
  });

  await updateParticipantLastInteraction(
    ctx,
    newIds,
    interactionId,
    interaction.date.toISOString(),
  );

  const participants = await db.people.findMany({
    select: { firstName: true, lastName: true },
    where: { id: { in: newIds }, userId: ctx.user.id },
  });

  const names =
    participants.map((p) => [p.firstName, p.lastName].filter(Boolean).join(" ")).join(", ") ||
    "unknown";

  return {
    interactionId,
    message: `Added ${names} to the interaction.`,
    participantsAdded: names,
  };
}

export async function removeParticipantsFromInteraction(
  ctx: DomainContext,
  interactionId: string,
  participantIds: string[],
) {
  const db = domainDb(ctx);

  await requireOwnedInteraction(ctx, interactionId);
  await assertOwnedPersonIds(ctx, participantIds);

  await db.interactionParticipant.deleteMany({
    where: {
      interactionId,
      personId: { in: participantIds },
    },
  });

  const people = await db.people.findMany({
    select: { firstName: true, lastName: true },
    where: { id: { in: participantIds }, userId: ctx.user.id },
  });

  const names =
    people.map((p) => [p.firstName, p.lastName].filter(Boolean).join(" ")).join(", ") || "unknown";

  return {
    interactionId,
    message: `Removed ${names} from the interaction.`,
    participantsRemoved: names,
  };
}

export async function updateInteractionDetails(
  ctx: DomainContext,
  interactionId: string,
  input: {
    title?: string;
    type?: InteractionType;
    date?: string;
    description?: string;
  },
) {
  const updates: Prisma.InteractionUpdateManyMutationInput = {};
  if (input.title !== undefined) {
    updates.title = input.title;
  }
  if (input.type !== undefined) {
    updates.type = input.type;
  }
  if (input.date !== undefined) {
    updates.date = new Date(input.date);
  }
  if (input.description !== undefined) {
    updates.description = input.description;
  }

  if (Object.keys(updates).length === 0) {
    throw new DomainError("No fields to update were provided.", 400, "interaction_no_fields");
  }

  const db = domainDb(ctx);

  await requireOwnedInteraction(ctx, interactionId);

  const updated = await db.interaction.updateMany({
    data: updates,
    where: { id: interactionId, userId: ctx.user.id },
  });
  if (updated.count === 0) {
    throw new DomainError("Interaction not found", 404, "interaction_not_found");
  }

  const interaction = await db.interaction.findFirst({
    select: {
      date: true,
      description: true,
      id: true,
      title: true,
      type: true,
    },
    where: { id: interactionId, userId: ctx.user.id },
  });
  if (!interaction) {
    throw new DomainError("Interaction not found", 404, "interaction_not_found");
  }

  if (input.date !== undefined) {
    await syncLastInteractionForExistingParticipants(ctx, interactionId, input.date);
  }

  return {
    date: interaction.date.toISOString(),
    description: interaction.description,
    id: interaction.id,
    message: "Updated interaction successfully.",
    title: interaction.title,
    type: interaction.type,
  };
}

export async function deleteInteractionWithSummary(ctx: DomainContext, interactionId: string) {
  const interaction = await requireOwnedInteraction(ctx, interactionId);

  await deleteInteraction(ctx, interactionId);

  return {
    message: `Deleted ${interaction.type} interaction "${interaction.title ?? "(untitled)"}" from ${interaction.date.toISOString()}.`,
  };
}
