import type { WebSocket } from "ws";
import websocket from "@fastify/websocket";
import type { AppRoutePlugin } from "../../lib/fastify-types.js";
import { parseSyncWsClientMessage } from "@bondery/schemas/sync";
import { applyOpenApiRouteMeta } from "../../lib/openapi-route-meta.js";
import { createAdminClient } from "../../lib/supabase.js";
import { getLastServerSequence } from "../../lib/sync/idempotency.js";
import {
  getSyncWakeRuntime,
  initSyncWakeRuntime,
  type SyncWakeSocket,
} from "../../lib/sync/wake/index.js";

function toSyncWakeSocket(socket: WebSocket): SyncWakeSocket {
  return {
    send: (data) => socket.send(data),
    close: (code, reason) => socket.close(code, reason),
    get readyState() {
      return socket.readyState;
    },
  };
}

function isAllowedOrigin(origin: string | undefined, allowedOrigins: string[]): boolean {
  if (!origin) return true;
  return allowedOrigins.some((allowed) => allowed === origin);
}

export const syncWsRoutes: AppRoutePlugin = async (fastify): Promise<void> => {
  fastify.addHook("onRoute", (routeOptions) => {
    applyOpenApiRouteMeta(routeOptions, { area: "session" });
  });

  await fastify.register(websocket);

  const allowedOrigins = [
    fastify.config.NEXT_PUBLIC_WEBAPP_URL,
    fastify.config.NEXT_PUBLIC_WEBSITE_URL,
    ...fastify.config.EXTRA_ALLOWED_ORIGINS.split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  ].filter(Boolean);

  fastify.get(
    "/ws",
    {
      config: {
        rateLimit: false,
      },
      websocket: true,
    },
    async (socket, request) => {
      const origin = request.headers.origin;
      if (!isAllowedOrigin(origin, allowedOrigins)) {
        socket.close(1008, "origin not allowed");
        return;
      }

      const ticket =
        typeof request.query === "object" && request.query !== null
          ? String((request.query as { ticket?: string }).ticket ?? "")
          : "";

      if (!ticket) {
        socket.close(1008, "missing ticket");
        return;
      }

      const runtime = getSyncWakeRuntime() ?? (await initSyncWakeRuntime(request.log));
      const userId = await runtime.tickets.consume(ticket);
      if (!userId) {
        socket.close(1008, "invalid ticket");
        return;
      }

      const wakeSocket = toSyncWakeSocket(socket);
      runtime.hub.register(userId, wakeSocket);

      try {
        const admin = createAdminClient();
        const serverSequence = await getLastServerSequence(admin, userId);
        runtime.hub.sendHello(userId, serverSequence);
      } catch (error) {
        request.log.error({ err: error, userId }, "sync wake hello failed");
      }

      socket.on("message", (raw) => {
        try {
          const text = typeof raw === "string" ? raw : raw.toString("utf8");
          const message = parseSyncWsClientMessage(JSON.parse(text));
          if (message?.type === "pong") {
            runtime.hub.onPong(wakeSocket);
          }
        } catch {
          // Ignore malformed client messages
        }
      });

      socket.on("close", () => {
        runtime.hub.unregister(wakeSocket);
      });

      socket.on("error", () => {
        runtime.hub.unregister(wakeSocket);
      });
    },
  );
};
