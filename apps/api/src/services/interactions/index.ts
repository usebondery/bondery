import type {
  AvatarTransformOptions,
  CreateInteractionInput,
  InteractionType,
  TablesUpdate,
  UpdateInteractionInput,
} from "@bondery/schemas";
import { type DomainContext, DomainError } from "../../domains/_shared/context.js";
import { internal } from "../../lib/platform/errors/http-errors.js";
import { loadFormattedInteraction } from "./format.js";

export type FormattedInteraction = NonNullable<
  Awaited<ReturnType<typeof loadFormattedInteraction>>
>;

export { loadFormattedInteraction, mapInteractionParticipant } from "./format.js";

export async function createInteraction(
  ctx: DomainContext,
  input: CreateInteractionInput,
): Promise<FormattedInteraction> {
  const { client, user } = ctx;

  const { data: interaction, error: interactionError } = await client
    .from("interactions")
    .insert({
      date: input.date,
      description: input.description || null,
      title: input.title || null,
      type: input.type,
      user_id: user.id,
    })
    .select("id")
    .single();

  if (interactionError || !interaction) {
    throw internal(
      "interaction_failed",
      interactionError?.message ?? "Failed to create interaction",
    );
  }

  if (input.participantIds && input.participantIds.length > 0) {
    const participantsData = input.participantIds.map((personId) => ({
      interaction_id: interaction.id,
      person_id: personId,
    }));

    const { error: participantsError } = await client
      .from("interaction_participants")
      .insert(participantsData);

    if (participantsError) {
      throw internal("interaction_participants_failed", participantsError.message);
    }

    await client
      .from("people")
      .update({
        last_interaction: input.date,
        last_interaction_activity_id: interaction.id,
      })
      .in("id", input.participantIds);
  }

  const formatted = await loadFormattedInteraction(client, user.id, interaction.id);
  if (!formatted) {
    throw internal("interaction_interaction_was_created_but_could_not_be");
  }

  return formatted;
}

export async function updateInteraction(
  ctx: DomainContext,
  interactionId: string,
  input: UpdateInteractionInput,
  avatarOptions?: AvatarTransformOptions,
): Promise<FormattedInteraction> {
  const { client, user } = ctx;

  const updates: TablesUpdate<"interactions"> = {};
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
    updates.date = input.date;
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await client.from("interactions").update(updates).eq("id", interactionId);
    if (error) {
      throw internal("interaction_failed", error.message);
    }
  }

  if (input.participantIds) {
    const { error: deleteParticipantsError } = await client
      .from("interaction_participants")
      .delete()
      .eq("interaction_id", interactionId);

    if (deleteParticipantsError) {
      throw internal("interaction_failed", deleteParticipantsError.message);
    }

    if (input.participantIds.length > 0) {
      const participantsData = input.participantIds.map((personId) => ({
        interaction_id: interactionId,
        person_id: personId,
      }));

      const { error: insertParticipantsError } = await client
        .from("interaction_participants")
        .insert(participantsData);

      if (insertParticipantsError) {
        throw internal("interaction_failed", insertParticipantsError.message);
      }

      if (input.date) {
        await client
          .from("people")
          .update({
            last_interaction: input.date,
            last_interaction_activity_id: interactionId,
          })
          .in("id", input.participantIds);
      }
    }
  } else if (input.date !== undefined) {
    const { data: participants } = await client
      .from("interaction_participants")
      .select("person_id")
      .eq("interaction_id", interactionId);

    if (participants && participants.length > 0 && input.date !== undefined) {
      const interactionDate = input.date;
      await Promise.all(
        participants.map((p) =>
          client
            .from("people")
            .update({
              last_interaction: interactionDate,
              last_interaction_activity_id: interactionId,
            })
            .eq("id", p.person_id)
            .eq("last_interaction_activity_id", interactionId),
        ),
      );
    }
  }

  const formatted = await loadFormattedInteraction(client, user.id, interactionId, avatarOptions);
  if (!formatted) {
    throw new DomainError("Interaction not found", 404, "interaction_not_found");
  }

  return formatted;
}

export async function deleteInteraction(ctx: DomainContext, interactionId: string) {
  const { client } = ctx;

  await client.from("interaction_participants").delete().eq("interaction_id", interactionId);

  const { error } = await client.from("interactions").delete().eq("id", interactionId);
  if (error) {
    throw internal("interaction_failed", error.message);
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
  const { client } = ctx;

  const interaction = await createInteraction(ctx, {
    date: input.date,
    description: input.description,
    participantIds: input.participantIds,
    title: input.title,
    type: input.type,
  });

  const { data: participants } = await client
    .from("people")
    .select("first_name, last_name")
    .in("id", input.participantIds);

  const names =
    participants?.map((p) => [p.first_name, p.last_name].filter(Boolean).join(" ")).join(", ") ??
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
  const { client } = ctx;

  const { data: interaction, error: interactionError } = await client
    .from("interactions")
    .select("id, date, title, type")
    .eq("id", interactionId)
    .single();

  if (interactionError || !interaction) {
    throw new DomainError("Interaction not found", 404, "interaction_not_found");
  }

  const { data: existing } = await client
    .from("interaction_participants")
    .select("person_id")
    .eq("interaction_id", interactionId);

  const existingIds = new Set(existing?.map((p) => p.person_id) ?? []);
  const newIds = participantIds.filter((id) => !existingIds.has(id));

  if (newIds.length === 0) {
    return {
      message: "All specified contacts are already part of this interaction.",
    };
  }

  const { error: insertError } = await client.from("interaction_participants").insert(
    newIds.map((personId) => ({
      interaction_id: interactionId,
      person_id: personId,
    })),
  );

  if (insertError) {
    throw internal("interaction_failed_to_add_participants_inserterror_m");
  }

  await Promise.all(
    newIds.map((personId) =>
      client
        .from("people")
        .update({
          last_interaction: interaction.date,
          last_interaction_activity_id: interactionId,
        })
        .eq("id", personId),
    ),
  );

  const { data: participants } = await client
    .from("people")
    .select("first_name, last_name")
    .in("id", newIds);

  const names =
    participants?.map((p) => [p.first_name, p.last_name].filter(Boolean).join(" ")).join(", ") ??
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
  const { client } = ctx;

  const { data: interaction, error: interactionError } = await client
    .from("interactions")
    .select("id, title, type")
    .eq("id", interactionId)
    .single();

  if (interactionError || !interaction) {
    throw new DomainError("Interaction not found", 404, "interaction_not_found");
  }

  const { error: deleteError } = await client
    .from("interaction_participants")
    .delete()
    .eq("interaction_id", interactionId)
    .in("person_id", participantIds);

  if (deleteError) {
    throw internal("interaction_failed_to_remove_participants_deleteerro");
  }

  const { data: people } = await client
    .from("people")
    .select("first_name, last_name")
    .in("id", participantIds);

  const names =
    people?.map((p) => [p.first_name, p.last_name].filter(Boolean).join(" ")).join(", ") ??
    "unknown";

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
  const updates: TablesUpdate<"interactions"> = {};
  if (input.title !== undefined) {
    updates.title = input.title;
  }
  if (input.type !== undefined) {
    updates.type = input.type;
  }
  if (input.date !== undefined) {
    updates.date = input.date;
  }
  if (input.description !== undefined) {
    updates.description = input.description;
  }

  if (Object.keys(updates).length === 0) {
    throw new DomainError("No fields to update were provided.", 400, "interaction_no_fields");
  }

  const { client } = ctx;
  const { data: interaction, error } = await client
    .from("interactions")
    .update(updates)
    .eq("id", interactionId)
    .select("id, title, type, date, description")
    .single();

  if (error || !interaction) {
    if (error) {
      throw internal("interaction_update_failed", error);
    }
    throw new DomainError("Interaction not found", 404, "interaction_not_found");
  }

  if (input.date !== undefined) {
    const { data: participants } = await client
      .from("interaction_participants")
      .select("person_id")
      .eq("interaction_id", interactionId);

    if (participants && participants.length > 0 && input.date !== undefined) {
      const interactionDate = input.date;
      await Promise.all(
        participants.map((p) =>
          client
            .from("people")
            .update({
              last_interaction: interactionDate,
              last_interaction_activity_id: interactionId,
            })
            .eq("id", p.person_id)
            .eq("last_interaction_activity_id", interactionId),
        ),
      );
    }
  }

  return {
    date: interaction.date,
    description: interaction.description,
    id: interaction.id,
    message: "Updated interaction successfully.",
    title: interaction.title,
    type: interaction.type,
  };
}

export async function deleteInteractionWithSummary(ctx: DomainContext, interactionId: string) {
  const { client } = ctx;

  const { data: interaction, error: fetchError } = await client
    .from("interactions")
    .select("id, title, type, date")
    .eq("id", interactionId)
    .single();

  if (fetchError || !interaction) {
    throw new DomainError("Interaction not found", 404, "interaction_not_found");
  }

  await deleteInteraction(ctx, interactionId);

  return {
    message: `Deleted ${interaction.type} interaction "${interaction.title ?? "(untitled)"}" from ${interaction.date}.`,
  };
}
