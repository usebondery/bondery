import { getErrorDocUrl } from "@bondery/schemas/errors";
import {
  SQLITE_SCHEMA_HEADER,
  SQLITE_SCHEMA_VERSION,
  SYNC_PROTOCOL_HEADER,
  SYNC_PROTOCOL_VERSION,
} from "@bondery/schemas/sync";
import type { FastifyReply, FastifyRequest } from "fastify";
import { URLS } from "../platform/config.js";

function websiteBaseUrl(): string {
  return (URLS.website ?? "https://usebondery.com").replace(/\/$/, "");
}

function sendProtocolMismatch(
  reply: FastifyReply,
  request: FastifyRequest,
  params: {
    code: "sync_protocol_mismatch" | "sqlite_schema_mismatch";
    message: string;
    details: Record<string, unknown>;
  },
): void {
  reply.status(426).send({
    error: {
      code: params.code,
      details: params.details,
      doc_url: getErrorDocUrl(params.code, websiteBaseUrl()),
      message: params.message,
      request_id: request.id,
      type: "invalid_request_error",
    },
  });
}

export function validateSyncProtocolHeaders(request: FastifyRequest, reply: FastifyReply): boolean {
  const clientVersionRaw = request.headers[SYNC_PROTOCOL_HEADER];
  const clientVersion = Array.isArray(clientVersionRaw) ? clientVersionRaw[0] : clientVersionRaw;

  if (!clientVersion || Number(clientVersion) !== SYNC_PROTOCOL_VERSION) {
    sendProtocolMismatch(reply, request, {
      code: "sync_protocol_mismatch",
      details: {
        clientVersion: clientVersion ? Number(clientVersion) : null,
        requiredVersion: SYNC_PROTOCOL_VERSION,
      },
      message: "Sync protocol version mismatch",
    });
    return false;
  }

  const sqliteSchemaRaw = request.headers[SQLITE_SCHEMA_HEADER];
  const sqliteSchema = Array.isArray(sqliteSchemaRaw) ? sqliteSchemaRaw[0] : sqliteSchemaRaw;

  if (sqliteSchema && Number(sqliteSchema) !== SQLITE_SCHEMA_VERSION) {
    sendProtocolMismatch(reply, request, {
      code: "sqlite_schema_mismatch",
      details: {
        clientVersion: Number(sqliteSchema),
        requiredVersion: SQLITE_SCHEMA_VERSION,
      },
      message: "SQLite schema version mismatch",
    });
    return false;
  }

  return true;
}
