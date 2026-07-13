import type { Contact } from "#entities/contact/types.js";
import type { Group } from "#entities/group/types.js";
import type { Tag } from "#entities/tag/types.js";
import type { SyncMutation } from "../mutations/types.js";

export interface SyncPushRequest {
  deviceId: string;
  mutations: SyncMutation[];
}

export interface WriteResult {
  serverSequence?: number;
  txid: string;
}

export type SyncPushAppliedResult = {
  data: unknown;
  id: string;
  serverSequence: number;
  status: "applied";
  txid: string;
};

export type SyncPushDuplicateResult = {
  data?: unknown;
  id: string;
  serverSequence: number;
  status: "duplicate";
  txid?: string;
};

export type SyncPushConflictResult = {
  error?: string;
  id: string;
  server: unknown;
  status: "conflict";
  txid?: string;
};

export type SyncPushRejectedResult = {
  error: string;
  id: string;
  status: "rejected";
};

export type SyncPushResult =
  | SyncPushAppliedResult
  | SyncPushDuplicateResult
  | SyncPushConflictResult
  | SyncPushRejectedResult;

export interface SyncPushResponse {
  nextServerSequence: number;
  results: SyncPushResult[];
  serverTime: string;
}

export interface SyncContactWriteData {
  contact: Contact;
}

export interface SyncGroupWriteData {
  group: Group;
}

export interface SyncTagWriteData {
  tag: Tag;
}

export interface SyncMembershipWriteData {
  addedCount?: number;
  removedCount?: number;
  skippedCount?: number;
}
