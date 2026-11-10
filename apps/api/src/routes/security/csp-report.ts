import { API_ROUTES } from "@bondery/helpers";
import { noContentResponse, standardErrorResponses } from "@bondery/schemas/http/responses";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import type { AppRoutePlugin } from "../../lib/platform/fastify-types.js";
import { CSP_REPORT_TIER } from "../../lib/platform/rate-limit.js";
import { compactCspReport } from "../../lib/platform/security/csp-report.js";
import { captureCspReport } from "../../services/analytics/csp-report.js";

/**
 * Hard cap on a report body. Real reports are a few hundred bytes; a burst of
 * 20 violations with long URLs still fits. 16 KiB is far below the 64 KiB
 * Fastify default, so an oversized body is rejected before it is parsed.
 */
const CSP_REPORT_BODY_LIMIT = 16 * 1024;

const CSP_REPORT_CONTENT_TYPES = ["application/csp-report", "application/reports+json"] as const;

const DESCRIPTION =
  "Receive a browser CSP violation report. " +
  "Accepts the legacy `application/csp-report` body and the Reporting API `application/reports+json` array. " +
  "No authentication: a browser cannot send a secret. " +
  "The body is untrusted, so only the directive, disposition, document path, blocked origin and path, " +
  "source file and line number are kept. The `sample` field and every query string are dropped. " +
  "Returns 204 regardless of the report contents.";

/**
 * CSP violation collection endpoint.
 *
 * Mounted with `openApiAreaRoutes("internal", plugin)`, NOT `internalRoutes`.
 * The `internal` shell requires a service-role bearer secret, and a browser
 * cannot send one. `openApiAreaRoutes` only stamps OpenAPI metadata, which
 * hides the route from the published reference and keeps CI's `openApiArea`
 * audit satisfied. Self-limiting comes from `CSP_REPORT_TIER`, not from auth.
 */
export const cspReportRoutes: AppRoutePlugin = async (fastify) => {
  for (const contentType of CSP_REPORT_CONTENT_TYPES) {
    fastify.addContentTypeParser(
      contentType,
      { bodyLimit: CSP_REPORT_BODY_LIMIT, parseAs: "string" },
      (_request, body, done) => {
        try {
          done(null, JSON.parse(body as string));
        } catch {
          done(null, null);
        }
      },
    );
  }

  fastify.post(
    "/",
    {
      config: { rateLimit: CSP_REPORT_TIER },
      schema: {
        description: DESCRIPTION,
        response: {
          ...noContentResponse,
          ...standardErrorResponses,
        },
        summary: "Report a CSP violation",
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      const report = compactCspReport(request.body, request.hostname);

      if (report) {
        await captureCspReport(report);
      }

      // Never echo the body back: it came from an untrusted page.
      return reply.status(204).send(null);
    },
  );
};

/** Exported so the mount table and tests agree on the path. */
export const CSP_REPORT_PATH = API_ROUTES.SECURITY_CSP_REPORT;
