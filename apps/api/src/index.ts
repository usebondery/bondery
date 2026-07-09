/**
 * Bondery API Server entry point.
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import "fastify";
import { buildApp } from "./build-app.js";
import { buildServer } from "./build-server.js";
import logger from "./lib/platform/logger.js";

function resolveListenAddress(config: {
  NEXT_PUBLIC_API_URL: string;
  API_PORT: number;
  API_HOST: string;
}) {
  const fallbackPort = Number(process.env.PORT) || Number(config.API_PORT) || 26631;
  const fallbackHost = config.API_HOST || "0.0.0.0";

  try {
    const url = new URL(config.NEXT_PUBLIC_API_URL);
    const urlPort = url.port ? Number(url.port) : undefined;
    return {
      host: fallbackHost,
      port: urlPort || fallbackPort,
    };
  } catch (error) {
    logger.warn({ err: error }, "Invalid NEXT_PUBLIC_API_URL, using defaults");
    return { host: fallbackHost, port: fallbackPort };
  }
}

async function start() {
  const server = await buildServer();
  const { port, host } = resolveListenAddress(server.config);

  try {
    await server.listen({ host, port });
    server.log.info(`Bondery API Server running at http://${host}:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

export { buildApp, buildServer };

let serverPromise: ReturnType<typeof buildServer> | null = null;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!serverPromise) {
    serverPromise = buildServer();
  }
  const server = await serverPromise;
  await server.ready();
  server.server.emit("request", req, res);
}

if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  start();
}
