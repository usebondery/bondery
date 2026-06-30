import type { FastifyReply, FastifyRequest } from "fastify";
import {
  SQLITE_SCHEMA_HEADER,
  SQLITE_SCHEMA_VERSION,
  SYNC_PROTOCOL_HEADER,
  SYNC_PROTOCOL_VERSION,
} from "@bondery/schemas/sync";

export function validateSyncProtocolHeaders(
  request: FastifyRequest,
  reply: FastifyReply,
): boolean {
  const clientVersionRaw = request.headers[SYNC_PROTOCOL_HEADER];
  const clientVersion = Array.isArray(clientVersionRaw)
    ? clientVersionRaw[0]
    : clientVersionRaw;

  if (!clientVersion || Number(clientVersion) !== SYNC_PROTOCOL_VERSION) {
    reply.status(426).send({
      error: "Sync protocol version mismatch",
      requiredVersion: SYNC_PROTOCOL_VERSION,
      clientVersion: clientVersion ? Number(clientVersion) : null,
    });
    return false;
  }

  const sqliteSchemaRaw = request.headers[SQLITE_SCHEMA_HEADER];
  const sqliteSchema = Array.isArray(sqliteSchemaRaw)
    ? sqliteSchemaRaw[0]
    : sqliteSchemaRaw;

  if (
    sqliteSchema &&
    Number(sqliteSchema) !== SQLITE_SCHEMA_VERSION
  ) {
    reply.status(426).send({
      error: "SQLite schema version mismatch",
      requiredVersion: SQLITE_SCHEMA_VERSION,
      clientVersion: Number(sqliteSchema),
    });
    return false;
  }

  return true;
}
