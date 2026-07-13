import type { CreateContactInput, UpdateContactInput } from "#entities/contact/types.js";
import type { CreateGroupInput } from "#entities/group/types.js";

export type SyncMutationType =
  | "contact.create"
  | "contact.update"
  | "contact.delete"
  | "contact.addTag"
  | "contact.removeTag"
  | "group.create"
  | "group.update"
  | "group.delete"
  | "group.addMembers"
  | "group.removeMembers"
  | "tag.create"
  | "tag.update"
  | "tag.delete";

export type ContactCreatePayload = CreateContactInput & { id?: string };

export type ContactUpdatePayload = UpdateContactInput;

export type ContactDeletePayload = Record<string, never> | undefined;

export interface ContactTagPayload {
  tagId: string;
}

export type GroupCreatePayload = CreateGroupInput & { id?: string };

export type GroupUpdatePayload = Partial<CreateGroupInput>;

export interface GroupMembersPayload {
  personIds: string[];
}

export interface TagCreatePayload {
  color?: string;
  id?: string;
  label: string;
}

export type TagUpdatePayload = Partial<{
  color: string;
  label: string;
}>;

type SyncMutationBase = {
  baseUpdatedAt?: string;
  clientSequence: number;
  id: string;
};

export type SyncMutation =
  | (SyncMutationBase & { payload: ContactCreatePayload; type: "contact.create" })
  | (SyncMutationBase & {
      entityId: string;
      payload: ContactUpdatePayload;
      type: "contact.update";
    })
  | (SyncMutationBase & {
      entityId: string;
      payload?: ContactDeletePayload;
      type: "contact.delete";
    })
  | (SyncMutationBase & { entityId: string; payload: ContactTagPayload; type: "contact.addTag" })
  | (SyncMutationBase & {
      entityId: string;
      payload: ContactTagPayload;
      type: "contact.removeTag";
    })
  | (SyncMutationBase & { payload: GroupCreatePayload; type: "group.create" })
  | (SyncMutationBase & {
      entityId: string;
      payload: GroupUpdatePayload;
      type: "group.update";
    })
  | (SyncMutationBase & {
      entityId: string;
      payload?: Record<string, never>;
      type: "group.delete";
    })
  | (SyncMutationBase & {
      entityId: string;
      payload: GroupMembersPayload;
      type: "group.addMembers";
    })
  | (SyncMutationBase & {
      entityId: string;
      payload: GroupMembersPayload;
      type: "group.removeMembers";
    })
  | (SyncMutationBase & { payload: TagCreatePayload; type: "tag.create" })
  | (SyncMutationBase & { entityId: string; payload: TagUpdatePayload; type: "tag.update" })
  | (SyncMutationBase & {
      entityId: string;
      payload?: Record<string, never>;
      type: "tag.delete";
    });

type OmitUnion<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

/** Client-side mutation before id / clientSequence are assigned. */
export type SyncMutationInput = OmitUnion<SyncMutation, "id" | "clientSequence"> & {
  id?: string;
};
