import type { ContactAddressType } from "@bondery/schemas";
import type { DomainContext } from "../../domains/_shared/context.js";
import { domainDb } from "../../domains/_shared/domain-db.js";
import {
  getMapAddressPinsInBboxWithDb,
  getMapPinsInBboxWithDb,
  type MapAddressPinRow,
  type MapPinRow,
} from "../../lib/data/contact-rpc.js";
import { extractAvatarOptions } from "../../lib/data/select-fragments.js";
import { internal } from "../../lib/platform/errors/http-errors.js";
import { resolveContactAvatarUrl } from "../../lib/storage/avatar-urls.js";
import type { MapBoundsQuery, ServiceLog } from "./queries-shared.js";

type ContactMapContext = Pick<DomainContext, "db" | "user"> & { log?: ServiceLog };

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

export async function getMapAddressPins(ctx: ContactMapContext, query: MapBoundsQuery) {
  const { user } = ctx;
  const db = domainDb(ctx as DomainContext);
  const { minLat, maxLat, minLon, maxLon, limit = 500 } = query;
  const avatarOptions = extractAvatarOptions(query);

  let data: MapAddressPinRow[];
  try {
    data = await getMapAddressPinsInBboxWithDb(db, user.id, {
      limit: Math.min(limit, 1000),
      maxLat,
      maxLon,
      minLat,
      minLon,
    });
  } catch (error) {
    ctx.log?.error({ err: error }, "Error fetching map address pins");
    throw internal(
      "internal_server_error",
      error instanceof Error ? error.message : "Failed to fetch map address pins",
    );
  }

  const pins = data.map((row) => ({
    addressCity: row.address_city,
    addressCountry: row.address_country,
    addressFormatted: row.address_formatted,
    addressId: row.address_id,
    addressType: row.address_type as ContactAddressType,
    avatar: resolveContactAvatarUrl(
      user.id,
      {
        avatarUpdatedAt: row.avatar_updated_at,
        hasAvatar: row.has_avatar,
        id: row.person_id,
      },
      avatarOptions,
    ),
    firstName: row.first_name,
    lastName: row.last_name,
    latitude: row.latitude,
    longitude: row.longitude,
    personId: row.person_id,
  }));

  return { pins };
}

export async function getMapPins(ctx: ContactMapContext, query: MapBoundsQuery) {
  const { user } = ctx;
  const db = domainDb(ctx as DomainContext);
  const { minLat, maxLat, minLon, maxLon, limit = 500 } = query;
  const avatarOptions = extractAvatarOptions(query);

  let data: MapPinRow[];
  try {
    data = await getMapPinsInBboxWithDb(db, user.id, {
      limit: Math.min(limit, 1000),
      maxLat,
      maxLon,
      minLat,
      minLon,
    });
  } catch (error) {
    ctx.log?.error({ err: error }, "Error fetching map pins");
    throw internal(
      "internal_server_error",
      error instanceof Error ? error.message : "Failed to fetch map pins",
    );
  }

  const pins = data.map((row) => ({
    avatar: resolveContactAvatarUrl(
      user.id,
      {
        avatarUpdatedAt: row.avatar_updated_at,
        hasAvatar: row.has_avatar,
        id: row.id,
      },
      avatarOptions,
    ),
    firstName: row.first_name,
    headline: row.headline,
    id: row.id,
    lastInteraction: row.last_interaction == null ? null : toIsoString(row.last_interaction),
    lastName: row.last_name,
    latitude: row.latitude,
    location: row.location,
    longitude: row.longitude,
  }));

  return { pins };
}
