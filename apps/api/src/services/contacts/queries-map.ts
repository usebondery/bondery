import type { Database } from "@bondery/schemas/supabase.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { extractAvatarOptions } from "../../lib/data/select-fragments.js";
import { resolveContactAvatarUrl } from "../../lib/data/supabase.js";
import { internal } from "../../lib/platform/errors/http-errors.js";
import type { MapBoundsQuery, ServiceLog } from "./queries-shared.js";

export async function getMapAddressPins(
  client: SupabaseClient<Database>,
  userId: string,
  query: MapBoundsQuery,
  log?: ServiceLog,
) {
  const { minLat, maxLat, minLon, maxLon, limit = 500 } = query;
  const avatarOptions = extractAvatarOptions(query);

  const { data, error } = await client.rpc("get_map_address_pins_in_bbox", {
    p_limit: Math.min(limit, 1000),
    p_max_lat: maxLat,
    p_max_lon: maxLon,
    p_min_lat: minLat,
    p_min_lon: minLon,
    p_user_id: userId,
  });

  if (error) {
    log?.error({ err: error }, "Error fetching map address pins");
    throw internal("internal_server_error", error.message);
  }

  const pins = (data || []).map(
    (row: {
      address_id: string;
      person_id: string;
      first_name: string;
      last_name: string | null;
      address_type: string;
      address_formatted: string | null;
      address_city: string | null;
      address_country: string | null;
      latitude: number;
      longitude: number;
      updated_at: string;
      has_avatar: boolean;
    }) => ({
      addressCity: row.address_city,
      addressCountry: row.address_country,
      addressFormatted: row.address_formatted,
      addressId: row.address_id,
      addressType: row.address_type,
      avatar: resolveContactAvatarUrl(
        client,
        userId,
        {
          hasAvatar: row.has_avatar,
          id: row.person_id,
          updatedAt: row.updated_at,
        },
        avatarOptions,
      ),
      firstName: row.first_name,
      lastName: row.last_name,
      latitude: row.latitude,
      longitude: row.longitude,
      personId: row.person_id,
    }),
  );

  return { pins };
}

export async function getMapPins(
  client: SupabaseClient<Database>,
  userId: string,
  query: MapBoundsQuery,
  log?: ServiceLog,
) {
  const { minLat, maxLat, minLon, maxLon, limit = 500 } = query;
  const avatarOptions = extractAvatarOptions(query);

  const { data, error } = await client.rpc("get_map_pins_in_bbox", {
    p_limit: Math.min(limit, 1000),
    p_max_lat: maxLat,
    p_max_lon: maxLon,
    p_min_lat: minLat,
    p_min_lon: minLon,
    p_user_id: userId,
  });

  if (error) {
    log?.error({ err: error }, "Error fetching map pins");
    throw internal("internal_server_error", error.message);
  }

  const pins = (data || []).map(
    (row: {
      id: string;
      first_name: string;
      last_name: string | null;
      headline: string | null;
      location: string | null;
      last_interaction: string | null;
      latitude: number;
      longitude: number;
      updated_at: string;
      has_avatar: boolean;
    }) => ({
      avatar: resolveContactAvatarUrl(
        client,
        userId,
        {
          hasAvatar: row.has_avatar,
          id: row.id,
          updatedAt: row.updated_at,
        },
        avatarOptions,
      ),
      firstName: row.first_name,
      headline: row.headline,
      id: row.id,
      lastInteraction: row.last_interaction,
      lastName: row.last_name,
      latitude: row.latitude,
      location: row.location,
      longitude: row.longitude,
    }),
  );

  return { pins };
}
