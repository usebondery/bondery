import {
  buildSyncWsUrl,
  parseSyncWsServerMessage,
  type SyncWsBatchMessage,
  syncWsTicketResponseSchema,
} from "@bondery/schemas/sync";
import { API_URL } from "@/lib/platform/config";

const MIN_RECONNECT_MS = 1_000;
const MAX_RECONNECT_MS = 30_000;

export type SyncWakeBatchHandler = (message: SyncWsBatchMessage) => void;

type SyncWakeWebClient = {
  stop: () => void;
};

let activeClient: SyncWakeWebClient | null = null;

async function fetchWsTicket(): Promise<string> {
  const response = await fetch("/api/sync/ws-ticket", {
    credentials: "include",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `WS ticket request failed (${response.status})`);
  }

  const json = await response.json();
  const parsed = syncWsTicketResponseSchema.parse(json);
  return parsed.ticket;
}

function sendPong(socket: WebSocket): void {
  socket.send(JSON.stringify({ type: "pong", v: 1 }));
}

export function startSyncWakeWebClient(onBatch: SyncWakeBatchHandler): SyncWakeWebClient {
  activeClient?.stop();

  let stopped = false;
  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectDelay = MIN_RECONNECT_MS;

  const connect = async () => {
    if (stopped) {
      return;
    }

    try {
      const ticket = await fetchWsTicket();
      const url = buildSyncWsUrl(API_URL, ticket);
      socket = new WebSocket(url);

      socket.onopen = () => {
        reconnectDelay = MIN_RECONNECT_MS;
      };

      socket.onmessage = (event) => {
        try {
          const raw = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
          const message = parseSyncWsServerMessage(raw);
          if (message?.type === "ping" && socket) {
            sendPong(socket);
            return;
          }
          if (message?.type === "sync.batch") {
            onBatch(message);
          }
        } catch {
          // Ignore malformed messages
        }
      };

      socket.onclose = () => {
        socket = null;
        if (!stopped) {
          scheduleReconnect();
        }
      };

      socket.onerror = () => {
        socket?.close();
      };
    } catch {
      if (!stopped) {
        scheduleReconnect();
      }
    }
  };

  const scheduleReconnect = () => {
    if (reconnectTimer || stopped) {
      return;
    }
    const jitter = Math.floor(Math.random() * 250);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_MS);
      void connect();
    }, reconnectDelay + jitter);
  };

  void connect();

  const client: SyncWakeWebClient = {
    stop: () => {
      stopped = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      socket?.close();
      socket = null;
      if (activeClient === client) {
        activeClient = null;
      }
    },
  };

  activeClient = client;
  return client;
}

export function stopSyncWakeWebClient(): void {
  activeClient?.stop();
}
