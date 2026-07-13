import type { AvatarTransformOptions } from "@bondery/schemas";
import type { DomainSupabaseClient } from "../../domains/_shared/context.js";
import { INTERACTION_SELECT } from "../../lib/data/select-fragments.js";
import { resolveContactAvatarUrl } from "../../lib/data/supabase.js";

export function mapInteractionParticipant(
  client: DomainSupabaseClient,
  userId: string,
  person: {
    id: string;
    first_name: string;
    last_name: string | null;
    has_avatar: boolean;
    updated_at: string;
  },
  avatarOptions?: AvatarTransformOptions,
) {
  return {
    avatar: resolveContactAvatarUrl(
      client,
      userId,
      {
        hasAvatar: person.has_avatar,
        id: person.id,
        updatedAt: person.updated_at,
      },
      avatarOptions,
    ),
    firstName: person.first_name,
    id: person.id,
    lastName: person.last_name,
    updatedAt: person.updated_at,
  };
}

export async function loadFormattedInteraction(
  client: DomainSupabaseClient,
  userId: string,
  interactionId: string,
  avatarOptions?: AvatarTransformOptions,
) {
  const { data: interaction, error } = await client
    .from("interactions")
    .select(INTERACTION_SELECT)
    .eq("id", interactionId)
    .eq("user_id", userId)
    .single();

  if (error || !interaction) {
    return null;
  }

  return {
    createdAt: interaction.created_at,
    date: interaction.date,
    description: interaction.description,
    id: interaction.id,
    participants: interaction.participants.map(
      (participant: { person: Parameters<typeof mapInteractionParticipant>[2] }) =>
        mapInteractionParticipant(client, userId, participant.person, avatarOptions),
    ),
    title: interaction.title,
    type: interaction.type,
    updatedAt: interaction.updated_at,
  };
}
