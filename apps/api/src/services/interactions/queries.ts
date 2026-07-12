import type { InteractionType } from "@bondery/schemas";
import type { AvatarTransformQuery } from "@bondery/schemas/http";
import type { Database } from "@bondery/schemas/supabase.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildPaginatedResponse,
  buildPaginationMeta,
  parsePagination,
} from "../../lib/data/pagination.js";
import {
  extractAvatarOptions,
  INTERACTION_SELECT,
  INTERACTION_SELECT_BY_CONTACT,
} from "../../lib/data/select-fragments.js";
import { internal, notFound } from "../../lib/platform/errors/http-errors.js";
import { mapInteractionParticipant } from "./format.js";

export type InteractionsListQuery = AvatarTransformQuery & {
  limit?: number | string;
  offset?: number | string;
  contactId?: string;
};

type ServiceLog = {
  error: (payload: unknown, message: string) => void;
};

export async function listInteractions(
  client: SupabaseClient<Database>,
  userId: string,
  query: InteractionsListQuery,
  log?: ServiceLog,
) {
  const { limit, offset } = parsePagination(query);
  const avatarOptions = extractAvatarOptions(query);
  const contactId = query.contactId;

  if (contactId) {
    const { data: person, error: personError } = await client
      .from("people")
      .select("id")
      .eq("id", contactId)
      .eq("user_id", userId)
      .maybeSingle();

    if (personError) {
      log?.error({ err: personError }, "Error verifying contact for interactions list");
      throw internal("internal_server_error", personError.message);
    }

    if (!person) {
      throw notFound("Contact not found", "not_found");
    }
  }

  let interactionsQuery = client
    .from("interactions")
    .select(contactId ? INTERACTION_SELECT_BY_CONTACT : INTERACTION_SELECT, { count: "exact" })
    .order("date", { ascending: false });

  if (contactId) {
    interactionsQuery = interactionsQuery.eq("participants.person_id", contactId);
  }

  const {
    data: interactions,
    error,
    count,
  } = await interactionsQuery.range(offset, offset + limit - 1);

  if (error) {
    log?.error({ err: error }, "Error fetching interactions");
    throw internal("internal_server_error", error.message);
  }

  const formattedInteractions = interactions.map((interaction) => ({
    createdAt: interaction.created_at,
    date: interaction.date,
    description: interaction.description,
    id: interaction.id,
    participants: interaction.participants.map((participant) =>
      mapInteractionParticipant(client, userId, participant.person, avatarOptions),
    ),
    title: interaction.title,
    type: interaction.type as InteractionType,
    updatedAt: interaction.updated_at,
    userId: interaction.user_id,
  }));

  const totalCount = typeof count === "number" ? count : formattedInteractions.length;
  const pagination = buildPaginationMeta({
    itemCount: formattedInteractions.length,
    limit,
    offset,
    search: null,
    sort: "dateDesc",
    totalCount,
  });

  return buildPaginatedResponse("interactions", formattedInteractions, pagination);
}
