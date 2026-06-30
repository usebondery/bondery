"use client";

import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type {
  InstagramImportCommitRequest,
  LinkedInImportCommitRequest,
  VCardImportCommitRequest,
} from "@bondery/schemas";
import {
  commitInstagramImport,
  commitLinkedInImport,
  commitVCardImport,
  parseInstagramImport,
  parseLinkedInImport,
  parseVCardImport,
  refreshMergeRecommendationsAfterImport,
} from "@/lib/api/domains/imports";
import { invalidateAfterImport } from "@/lib/query/invalidation";

type CommitInput<T> = {
  body: T;
  /** When false, skip cache invalidation (for intermediate import batches). */
  finalize?: boolean;
};

async function afterImportCommit(queryClient: QueryClient) {
  await refreshMergeRecommendationsAfterImport();
  await invalidateAfterImport(queryClient);
}

export function useParseVCardImportMutation() {
  return useMutation({ mutationFn: parseVCardImport });
}

export function useCommitVCardImportMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ body }: CommitInput<VCardImportCommitRequest>) => commitVCardImport(body),
    onSuccess: async (_data, { finalize = true }) => {
      if (finalize) {
        await afterImportCommit(queryClient);
      }
    },
  });
}

export function useParseLinkedInImportMutation() {
  return useMutation({ mutationFn: parseLinkedInImport });
}

export function useCommitLinkedInImportMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ body }: CommitInput<LinkedInImportCommitRequest>) =>
      commitLinkedInImport(body),
    onSuccess: async (_data, { finalize = true }) => {
      if (finalize) {
        await afterImportCommit(queryClient);
      }
    },
  });
}

export function useParseInstagramImportMutation() {
  return useMutation({ mutationFn: parseInstagramImport });
}

export function useCommitInstagramImportMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ body }: CommitInput<InstagramImportCommitRequest>) =>
      commitInstagramImport(body),
    onSuccess: async (_data, { finalize = true }) => {
      if (finalize) {
        await afterImportCommit(queryClient);
      }
    },
  });
}
