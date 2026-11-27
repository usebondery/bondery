import type { AppFastifyInstance } from "../platform/fastify-types.js";

/** DAV bodies are XML or vCard. This milestone reads none, so a small cap is enough. */
const DISCARDED_BODY_LIMIT_BYTES = 65_536;

/**
 * Accepts any content type and drops the body. Without a parser, Fastify answers an XML
 * `PROPFIND` with 415 before the handler runs, which hides the real answer (the redirect, or
 * 501 behind the shell). Scope this to the DAV plugins: it must not apply to the REST routes.
 */
export function registerDiscardBodyParser(fastify: AppFastifyInstance): void {
  fastify.addContentTypeParser(
    "*",
    { bodyLimit: DISCARDED_BODY_LIMIT_BYTES, parseAs: "buffer" },
    (_request, _body, done) => {
      done(null, undefined);
    },
  );
}
