import { buildApiErrorFromResponse } from "@bondery/helpers/api";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import {
  buildSyncWsUrl,
  parseSyncWsServerMessage,
  type SyncWsBatchMessage,
  syncWsTicketResponseSchema,
} from "@bondery/schemas/sync";
import { mobileFetch } from "../api/transport";
import { getAccessToken } from "../auth/client";
import { AuthRequiredError, endLocalSession } from "../auth/session";
import { API_URL } from "../config";
import { syncRequestHeaders } from "./constants";
import { ensureDeviceId } from "./outbox/pending-mutations";
import { shouldReconnectSyncWake } from "./pull-auth";
import { onSyncWakeEvent, onSyncWakeReconnect, setSyncPullMode } from "./pull-manager";

const MIN_RECONNECT_MS = 1_000;
const MAX_RECONNECT_MS = 30_000;

type SyncWakeClient = {
  stop: () => void;
};

let activeClient: SyncWakeClient | null = null;

async function fetchWsTicket(): Promise<string> {
  const token = await getAccessToken();
  if (!token) {
    throw new AuthRequiredError("missing_local_session");
  }

  const response = await mobileFetch(`${API_URL}${API_ROUTES.SYNC_WS_TICKET}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      ...syncRequestHeaders(),
    },
  });

  if (response.status === 401) {
    await endLocalSession({ reason: "session_expired" });
    throw new AuthRequiredError("session_revoked");
  }

  if (!response.ok) {
    const text = await response.text();
    throw buildApiErrorFromResponse({
      bodyText: text,
      status: response.status,
    });
  }

  const json = await response.json();
  const parsed = syncWsTicketResponseSchema.parse(json);
  return parsed.ticket;
}

function sendPong(socket: WebSocket): void {
  socket.send(JSON.stringify({ type: "pong", v: 1 }));
}

function handleServerMessage(
  message: ReturnType<typeof parseSyncWsServerMessage>,
  myDeviceId: string,
): void {
  if (!message) {
    return;
  }

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
      myDeviceId,
      serverSequence: batch.serverSequence,
      sourceDeviceId: batch.sourceDeviceId,
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
    if (stopped) {
      return;
    }

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
    } catch (error) {
      setSyncPullMode("long_poll");
      if (!stopped && shouldReconnectSyncWake(error)) {
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
