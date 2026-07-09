import {
  type ApiErrorCode,
  getErrorDefinition,
  getErrorDocUrl,
  isApiErrorCode,
} from "@bondery/schemas/errors";
import { WEBSITE_URL } from "@/lib/platform/config";

type BuildNestedErrorResponseParams = {
  code: ApiErrorCode;
  message: string;
  status: number;
  requestId?: string;
  details?: Record<string, unknown>;
};

function websiteBaseUrl(): string {
  return WEBSITE_URL.replace(/\/$/, "");
}

export function buildNestedErrorResponse(params: BuildNestedErrorResponseParams): Response {
  const code = isApiErrorCode(params.code) ? params.code : "internal_server_error";
  const definition = getErrorDefinition(code);
  const requestId = params.requestId ?? crypto.randomUUID();

  const body = {
    error: {
      code,
      doc_url: getErrorDocUrl(code, websiteBaseUrl()),
      message: params.message,
      request_id: requestId,
      type: definition.type,
      ...(params.details ? { details: params.details } : {}),
    },
  };

  return Response.json(body, { status: params.status });
}
