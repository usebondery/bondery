import type { SyncMutation, SyncPushResult } from "@bondery/schemas/sync";
import {
  createContact,
  updateContact,
  deleteContact,
  addContactTag,
  removeContactTag,
} from "../../domains/contacts/index.js";
import {
  createGroup,
  updateGroup,
  deleteGroup,
  addGroupMembers,
  removeGroupMembers,
} from "../../domains/groups/index.js";
import { createTag, updateTag, deleteTag } from "../../domains/tags/index.js";
import { DomainError, type DomainContext } from "../../domains/_shared/context.js";
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
          txid,
          result: {
            id: mutation.id,
            status: "applied",
            serverSequence,
            txid,
            data: { contact: data.contact },
          },
        };
      }
      case "contact.update": {
        const { data, txid, serverSequence } = await updateContact(ctx, {
          personId: mutation.entityId,
          patch: mutation.payload,
          baseUpdatedAt: mutation.baseUpdatedAt,
        });
        return {
          txid,
          result: {
            id: mutation.id,
            status: "applied",
            serverSequence,
            txid,
            data: { contact: data.contact },
          },
        };
      }
      case "contact.delete": {
        const { txid, serverSequence } = await deleteContact(ctx, mutation.entityId);
        return {
          txid,
          result: {
            id: mutation.id,
            status: "applied",
            serverSequence,
            txid,
            data: { deletedId: mutation.entityId },
          },
        };
      }
      case "contact.addTag": {
        const { data, txid, serverSequence } = await addContactTag(
          ctx,
          mutation.entityId,
          mutation.payload.tagId,
        );
        return {
          txid,
          result: {
            id: mutation.id,
            status: "applied",
            serverSequence,
            txid,
            data: { tag: data.tag },
          },
        };
      }
      case "contact.removeTag": {
        const { txid, serverSequence } = await removeContactTag(
          ctx,
          mutation.entityId,
          mutation.payload.tagId,
        );
        return {
          txid,
          result: {
            id: mutation.id,
            status: "applied",
            serverSequence,
            txid,
            data: { personId: mutation.entityId, tagId: mutation.payload.tagId },
          },
        };
      }
      case "group.create": {
        const { data, txid, serverSequence } = await createGroup(ctx, mutation.payload);
        return {
          txid,
          result: {
            id: mutation.id,
            status: "applied",
            serverSequence,
            txid,
            data: { group: data.group },
          },
        };
      }
      case "group.update": {
        const { data, txid, serverSequence } = await updateGroup(
          ctx,
          mutation.entityId,
          mutation.payload,
        );
        return {
          txid,
          result: {
            id: mutation.id,
            status: "applied",
            serverSequence,
            txid,
            data: { group: data.group },
          },
        };
      }
      case "group.delete": {
        const { txid, serverSequence } = await deleteGroup(ctx, mutation.entityId);
        return {
          txid,
          result: {
            id: mutation.id,
            status: "applied",
            serverSequence,
            txid,
            data: { deletedId: mutation.entityId },
          },
        };
      }
      case "group.addMembers": {
        const { data, txid, serverSequence } = await addGroupMembers(
          ctx,
          mutation.entityId,
          mutation.payload.personIds,
        );
        return {
          txid,
          result: {
            id: mutation.id,
            status: "applied",
            serverSequence,
            txid,
            data,
          },
        };
      }
      case "group.removeMembers": {
        const { data, txid, serverSequence } = await removeGroupMembers(
          ctx,
          mutation.entityId,
          mutation.payload.personIds,
        );
        return {
          txid,
          result: {
            id: mutation.id,
            status: "applied",
            serverSequence,
            txid,
            data,
          },
        };
      }
      case "tag.create": {
        const { data, txid, serverSequence } = await createTag(ctx, mutation.payload);
        return {
          txid,
          result: {
            id: mutation.id,
            status: "applied",
            serverSequence,
            txid,
            data: { tag: data.tag },
          },
        };
      }
      case "tag.update": {
        const { data, txid, serverSequence } = await updateTag(
          ctx,
          mutation.entityId,
          mutation.payload,
        );
        return {
          txid,
          result: {
            id: mutation.id,
            status: "applied",
            serverSequence,
            txid,
            data: { tag: data.tag },
          },
        };
      }
      case "tag.delete": {
        const { txid, serverSequence } = await deleteTag(ctx, mutation.entityId);
        return {
          txid,
          result: {
            id: mutation.id,
            status: "applied",
            serverSequence,
            txid,
            data: { deletedId: mutation.entityId },
          },
        };
      }
      default: {
        const exhaustive: never = mutation;
        return {
          result: {
            id: (exhaustive as SyncMutation).id,
            status: "rejected",
            error: "Unknown mutation type",
          },
        };
      }
    }
  } catch (error) {
    if (error instanceof SyncConflictError) {
      return {
        result: {
          id: mutation.id,
          status: "conflict",
          server: { contact: error.serverContact },
          error: error.message,
        },
      };
    }

    if (error instanceof DomainError) {
      return {
        result: {
          id: mutation.id,
          status: "rejected",
          error: error.message,
        },
      };
    }

    throw error;
  }
}
