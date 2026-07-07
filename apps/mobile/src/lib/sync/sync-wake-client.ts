import { API_ROUTES } from "@bondery/helpers/globals/paths";
import {
  buildSyncWsUrl,
  parseSyncWsServerMessage,
  syncWsTicketResponseSchema,
  type SyncWsBatchMessage,
} from "@bondery/schemas/sync";
import { API_URL } from "../config";
import { supabase } from "../supabase/client";
import { syncRequestHeaders } from "./constants";
import { ensureDeviceId } from "./outbox/pending-mutations";
import {
  onSyncWakeEvent,
  onSyncWakeReconnect,
  setSyncPullMode,
} from "./pull-manager";

const MIN_RECONNECT_MS = 1_000;
const MAX_RECONNECT_MS = 30_000;

type SyncWakeClient = {
  stop: () => void;
};

let activeClient: SyncWakeClient | null = null;

async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function fetchWsTicket(): Promise<string> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${API_URL}${API_ROUTES.SYNC_WS_TICKET}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      ...syncRequestHeaders(),
    },
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
  socket.send(JSON.stringify({ v: 1, type: "pong" }));
}

function handleServerMessage(
  message: ReturnType<typeof parseSyncWsServerMessage>,
  myDeviceId: string,
): void {
  if (!message) return;

  if (message.type === "ping") {
    return;
  }

  if (message.type === "sync.hello") {
    onSyncWakeReconnect();
    return;
  }

  if (message.type === "sync.batch") {
    const batch = message as SyncWsBatchMessage;
    onSyncWakeEvent({
      serverSequence: batch.serverSequence,
      sourceDeviceId: batch.sourceDeviceId,
      myDeviceId,
    });
  }
}

export async function startSyncWakeClient(): Promise<SyncWakeClient> {
  activeClient?.stop();
  let stopped = false;
  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectDelay = MIN_RECONNECT_MS;
  const myDeviceId = await ensureDeviceId();

  const connect = async () => {
    if (stopped) return;

    try {
      const ticket = await fetchWsTicket();
      const url = buildSyncWsUrl(API_URL, ticket);
      socket = new WebSocket(url);

      socket.onopen = () => {
        reconnectDelay = MIN_RECONNECT_MS;
        setSyncPullMode("websocket_wake");
      };

      socket.onmessage = (event) => {
        try {
          const raw = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
          const message = parseSyncWsServerMessage(raw);
          if (message?.type === "ping" && socket) {
            sendPong(socket);
          }
          handleServerMessage(message, myDeviceId);
        } catch {
          // Ignore malformed messages
        }
      };

      socket.onclose = () => {
        setSyncPullMode("long_poll");
        socket = null;
        if (!stopped) {
          scheduleReconnect();
        }
      };

      socket.onerror = () => {
        socket?.close();
      };
    } catch {
      setSyncPullMode("long_poll");
      if (!stopped) {
        scheduleReconnect();
      }
    }
  };

  const scheduleReconnect = () => {
    if (reconnectTimer || stopped) return;
    const jitter = Math.floor(Math.random() * 250);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_MS);
      void connect();
    }, reconnectDelay + jitter);
  };

  void connect();

  const client: SyncWakeClient = {
    stop: () => {
      stopped = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      socket?.close();
      socket = null;
      setSyncPullMode("long_poll");
      if (activeClient === client) {
        activeClient = null;
      }
    },
  };

  activeClient = client;
  return client;
}

export function stopSyncWakeClient(): void {
  activeClient?.stop();
}
