import type { FastifyBaseLogger } from "fastify";
import type { SyncWsServerMessage } from "@bondery/schemas/sync";
import {
  toSyncWsBatchMessage,
  toSyncWsHelloMessage,
  toSyncWsPingMessage,
} from "@bondery/schemas/sync";
import type { SyncWakeEvent, SyncWakeSocket } from "./types.js";
import { WS_OPEN } from "./types.js";

const MAX_SOCKETS_PER_USER = 5;
const PING_INTERVAL_MS = 30_000;
const PONG_TIMEOUT_MS = 10_000;

type SocketEntry = {
  socket: SyncWakeSocket;
  userId: string;
  awaitingPong: boolean;
};

export class SyncConnectionHub {
  private readonly socketsByUser = new Map<string, Set<SocketEntry>>();
  private readonly pingTimers = new Map<SyncWakeSocket, ReturnType<typeof setInterval>>();
  private readonly pongTimers = new Map<SyncWakeSocket, ReturnType<typeof setTimeout>>();

  constructor(private readonly log?: FastifyBaseLogger) {}

  register(userId: string, socket: SyncWakeSocket): void {
    this.enforceConnectionLimit(userId);
    const entry: SocketEntry = { socket, userId, awaitingPong: false };
    let set = this.socketsByUser.get(userId);
    if (!set) {
      set = new Set();
      this.socketsByUser.set(userId, set);
    }
    set.add(entry);
    this.startHeartbeat(entry);
    this.log?.info({ event: "sync.ws.connect", userId }, "sync wake websocket connected");
  }

  unregister(socket: SyncWakeSocket): void {
    this.clearHeartbeat(socket);
    for (const [userId, set] of this.socketsByUser) {
      for (const entry of set) {
        if (entry.socket === socket) {
          set.delete(entry);
          if (set.size === 0) {
            this.socketsByUser.delete(userId);
          }
          this.log?.info({ event: "sync.ws.disconnect", userId }, "sync wake websocket disconnected");
          return;
        }
      }
    }
  }

  getConnectionCount(): number {
    let total = 0;
    for (const set of this.socketsByUser.values()) {
      total += set.size;
    }
    return total;
  }

  sendToSocket(socket: SyncWakeSocket, message: SyncWsServerMessage): void {
    if (socket.readyState !== WS_OPEN) {
      this.unregister(socket);
      return;
    }
    try {
      socket.send(JSON.stringify(message));
    } catch (error) {
      this.log?.warn({ err: error }, "sync wake websocket send failed");
      this.unregister(socket);
    }
  }

  broadcastToUser(userId: string, message: SyncWsServerMessage): void {
    const set = this.socketsByUser.get(userId);
    if (!set) return;

    const payload = JSON.stringify(message);
    for (const entry of [...set]) {
      if (entry.socket.readyState !== WS_OPEN) {
        this.unregister(entry.socket);
        continue;
      }
      try {
        entry.socket.send(payload);
      } catch (error) {
        this.log?.warn({ err: error, userId }, "sync wake websocket send failed");
        this.unregister(entry.socket);
      }
    }
  }

  sendHello(userId: string, serverSequence: number): void {
    this.broadcastToUser(userId, toSyncWsHelloMessage(serverSequence));
  }

  broadcastWake(userId: string, event: SyncWakeEvent): void {
    this.broadcastToUser(userId, toSyncWsBatchMessage(event));
  }

  private enforceConnectionLimit(userId: string): void {
    const set = this.socketsByUser.get(userId);
    if (!set || set.size < MAX_SOCKETS_PER_USER) return;

    const oldest = set.values().next().value as SocketEntry | undefined;
    if (oldest) {
      this.log?.info({ userId }, "sync wake websocket connection limit reached, closing oldest");
      oldest.socket.close(1008, "connection limit");
      this.unregister(oldest.socket);
    }
  }

  private startHeartbeat(entry: SocketEntry): void {
    const { socket } = entry;
    const pingTimer = setInterval(() => {
      if (socket.readyState !== WS_OPEN) {
        this.unregister(socket);
        return;
      }
      if (entry.awaitingPong) {
        socket.close(1000, "pong timeout");
        this.unregister(socket);
        return;
      }
      entry.awaitingPong = true;
      this.sendToSocket(socket, toSyncWsPingMessage());
      const pongTimer = setTimeout(() => {
        if (entry.awaitingPong) {
          socket.close(1000, "pong timeout");
          this.unregister(socket);
        }
      }, PONG_TIMEOUT_MS);
      this.pongTimers.set(socket, pongTimer);
    }, PING_INTERVAL_MS);
    this.pingTimers.set(socket, pingTimer);
  }

  onPong(socket: SyncWakeSocket): void {
    const timer = this.pongTimers.get(socket);
    if (timer) {
      clearTimeout(timer);
      this.pongTimers.delete(socket);
    }
    for (const set of this.socketsByUser.values()) {
      for (const entry of set) {
        if (entry.socket === socket) {
          entry.awaitingPong = false;
          return;
        }
      }
    }
  }

  private clearHeartbeat(socket: SyncWakeSocket): void {
    const pingTimer = this.pingTimers.get(socket);
    if (pingTimer) {
      clearInterval(pingTimer);
      this.pingTimers.delete(socket);
    }
    const pongTimer = this.pongTimers.get(socket);
    if (pongTimer) {
      clearTimeout(pongTimer);
      this.pongTimers.delete(socket);
    }
  }
}
