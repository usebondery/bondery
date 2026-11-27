/** WebDAV and CardDAV protocol constants shared by the DAV routes. */

import type { AppFastifyInstance } from "../platform/fastify-types.js";

/**
 * Methods Fastify does not know. Fastify 5 requires `addHttpMethod` before a route uses one.
 * The first three carry the protocol. The rest are registered so that the authenticated shell
 * answers them (a later milestone returns 405), instead of the router answering 404 to a
 * request that never authenticated.
 */
const DAV_EXTENSION_METHODS = [
  "PROPFIND",
  "PROPPATCH",
  "REPORT",
  "MKCOL",
  "COPY",
  "MOVE",
  "LOCK",
  "UNLOCK",
] as const;

/**
 * Route config shared by every DAV route. DAV clients are not browsers, so no route sends CORS
 * headers, and a cross-site page cannot pass a preflight to `PUT`, `DELETE` or `REPORT`. It also
 * stops the global strict-preflight check from answering 400 to a plain `OPTIONS` probe.
 */
export const DAV_ROUTE_CONFIG = { cors: false } as const;

/** Value of the `DAV` response header: WebDAV class 1, access control-free, and CardDAV. */
export const DAV_COMPLIANCE_HEADER = "1, 3, addressbook";

/** Methods the address book will serve. `Allow` on OPTIONS lists exactly these. */
export const DAV_ALLOWED_METHODS = [
  "OPTIONS",
  "GET",
  "HEAD",
  "PUT",
  "DELETE",
  "PROPFIND",
  "PROPPATCH",
  "REPORT",
] as const;

/** Every method a request to `/dav/*` can use behind the authenticated shell. */
export const DAV_SHELL_METHODS = [
  "GET",
  "HEAD",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  ...DAV_EXTENSION_METHODS,
] as const;

/**
 * Teaches the router the WebDAV verbs. Call once on the root instance, before any route that
 * uses them. All of them may carry a body (`PROPFIND`, `REPORT`, and `LOCK` do).
 */
export function registerDavHttpMethods(fastify: AppFastifyInstance): void {
  for (const method of DAV_EXTENSION_METHODS) {
    fastify.addHttpMethod(method, { hasBody: true });
  }
}
