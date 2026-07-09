import type { SyncMutation, SyncPushResult } from "@bondery/schemas/sync";
import { type DomainContext, DomainError } from "../../domains/_shared/context.js";
import {
  addContactTag,
  createContact,
  deleteContact,
  removeContactTag,
  updateContact,
} from "../../domains/contacts/index.js";
import {
  addGroupMembers,
  createGroup,
  deleteGroup,
  removeGroupMembers,
  updateGroup,
} from "../../domains/groups/index.js";
import { createTag, deleteTag, updateTag } from "../../domains/tags/index.js";
import { SyncConflictError } from "./conflict.js";

export async function applySyncMutation(
  ctx: DomainContext,
  mutation: SyncMutation,
): Promise<{ result: SyncPushResult; txid?: string }> {
  try {
    switch (mutation.type) {
      case "contact.create": {
        const { data, txid, serverSequence } = await createContact(ctx, mutation.payload);
        return {
          result: {
            data: { contact: data.contact },
            id: mutation.id,
            serverSequence,
            status: "applied",
            txid,
          },
          txid,
        };
      }
      case "contact.update": {
        const { data, txid, serverSequence } = await updateContact(ctx, {
          baseUpdatedAt: mutation.baseUpdatedAt,
          patch: mutation.payload,
          personId: mutation.entityId,
        });
        return {
          result: {
            data: { contact: data.contact },
            id: mutation.id,
            serverSequence,
            status: "applied",
            txid,
          },
          txid,
        };
      }
      case "contact.delete": {
        const { txid, serverSequence } = await deleteContact(ctx, mutation.entityId);
        return {
          result: {
            data: { deletedId: mutation.entityId },
            id: mutation.id,
            serverSequence,
            status: "applied",
            txid,
          },
          txid,
        };
      }
      case "contact.addTag": {
        const { data, txid, serverSequence } = await addContactTag(
          ctx,
          mutation.entityId,
          mutation.payload.tagId,
        );
        return {
          result: {
            data: { tag: data.tag },
            id: mutation.id,
            serverSequence,
            status: "applied",
            txid,
          },
          txid,
        };
      }
      case "contact.removeTag": {
        const { txid, serverSequence } = await removeContactTag(
          ctx,
          mutation.entityId,
          mutation.payload.tagId,
        );
        return {
          result: {
            data: { personId: mutation.entityId, tagId: mutation.payload.tagId },
            id: mutation.id,
            serverSequence,
            status: "applied",
            txid,
          },
          txid,
        };
      }
      case "group.create": {
        const { data, txid, serverSequence } = await createGroup(ctx, mutation.payload);
        return {
          result: {
            data: { group: data.group },
            id: mutation.id,
            serverSequence,
            status: "applied",
            txid,
          },
          txid,
        };
      }
      case "group.update": {
        const { data, txid, serverSequence } = await updateGroup(
          ctx,
          mutation.entityId,
          mutation.payload,
        );
        return {
          result: {
            data: { group: data.group },
            id: mutation.id,
            serverSequence,
            status: "applied",
            txid,
          },
          txid,
        };
      }
      case "group.delete": {
        const { txid, serverSequence } = await deleteGroup(ctx, mutation.entityId);
        return {
          result: {
            data: { deletedId: mutation.entityId },
            id: mutation.id,
            serverSequence,
            status: "applied",
            txid,
          },
          txid,
        };
      }
      case "group.addMembers": {
        const { data, txid, serverSequence } = await addGroupMembers(
          ctx,
          mutation.entityId,
          mutation.payload.personIds,
        );
        return {
          result: {
            data,
            id: mutation.id,
            serverSequence,
            status: "applied",
            txid,
          },
          txid,
        };
      }
      case "group.removeMembers": {
        const { data, txid, serverSequence } = await removeGroupMembers(
          ctx,
          mutation.entityId,
          mutation.payload.personIds,
        );
        return {
          result: {
            data,
            id: mutation.id,
            serverSequence,
            status: "applied",
            txid,
          },
          txid,
        };
      }
      case "tag.create": {
        const { data, txid, serverSequence } = await createTag(ctx, mutation.payload);
        return {
          result: {
            data: { tag: data.tag },
            id: mutation.id,
            serverSequence,
            status: "applied",
            txid,
          },
          txid,
        };
      }
      case "tag.update": {
        const { data, txid, serverSequence } = await updateTag(
          ctx,
          mutation.entityId,
          mutation.payload,
        );
        return {
          result: {
            data: { tag: data.tag },
            id: mutation.id,
            serverSequence,
            status: "applied",
            txid,
          },
          txid,
        };
      }
      case "tag.delete": {
        const { txid, serverSequence } = await deleteTag(ctx, mutation.entityId);
        return {
          result: {
            data: { deletedId: mutation.entityId },
            id: mutation.id,
            serverSequence,
            status: "applied",
            txid,
          },
          txid,
        };
      }
      default: {
        const exhaustive: never = mutation;
        return {
          result: {
            error: "Unknown mutation type",
            id: (exhaustive as SyncMutation).id,
            status: "rejected",
          },
        };
      }
    }
  } catch (error) {
    if (error instanceof SyncConflictError) {
      return {
        result: {
          error: error.message,
          id: mutation.id,
          server: { contact: error.serverContact },
          status: "conflict",
        },
      };
    }

    if (error instanceof DomainError) {
      return {
        result: {
          error: error.message,
          id: mutation.id,
          status: "rejected",
        },
      };
    }

    throw error;
  }
}
