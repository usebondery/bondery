import {
  affectedTablesTouchContacts,
  affectedTablesTouchGroups,
  affectedTablesTouchTags,
} from "@bondery/helpers/sync/affected-tables";
import type { SyncTableKey } from "@bondery/schemas/sync";
import { notifyManager, type Query, type QueryClient, type QueryKey } from "@tanstack/react-query";
import { getSqliteQueryClient } from "./sqlite-query-client";

export type SqliteQueryMeta = {
  sqliteRead: () => unknown;
};

function getTouchedDomains(tables: readonly SyncTableKey[]): Set<string> {
  const domains = new Set<string>();
  const touchesGroups = affectedTablesTouchGroups(tables);
  const touchesTags = affectedTablesTouchTags(tables);

  if (affectedTablesTouchContacts(tables) || touchesGroups || touchesTags) {
    domains.add("contacts");
  }
  if (touchesGroups) {
    domains.add("groups");
  }
  if (touchesTags) {
    domains.add("tags");
  }

  return domains;
}

function matchesTouchedDomain(queryKey: QueryKey, domains: ReadonlySet<string>): boolean {
  return queryKey[0] === "sqlite" && typeof queryKey[1] === "string" && domains.has(queryKey[1]);
}

function getSqliteRead(query: Query): (() => unknown) | null {
  const meta = query.options.meta as Partial<SqliteQueryMeta> | undefined;
  return typeof meta?.sqliteRead === "function" ? meta.sqliteRead : null;
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

export function refreshSqliteViews(
  tables: readonly SyncTableKey[],
  queryClient: QueryClient = getSqliteQueryClient(),
): void {
  const domains = getTouchedDomains(tables);
  if (domains.size === 0) {
    return;
  }

  const matchingQueries = queryClient
    .getQueryCache()
    .findAll({ predicate: (query) => matchesTouchedDomain(query.queryKey, domains) });

  notifyManager.batch(() => {
    for (const query of matchingQueries) {
      const sqliteRead = getSqliteRead(query);
      if (!query.isActive() || !sqliteRead) {
        queryClient.removeQueries({ exact: true, queryKey: query.queryKey });
        continue;
      }

      try {
        queryClient.setQueryData(query.queryKey, sqliteRead());
      } catch (error) {
        query.setState({
          data: undefined,
          error: toError(error),
          errorUpdateCount: query.state.errorUpdateCount + 1,
          errorUpdatedAt: Date.now(),
          fetchStatus: "idle",
          status: "error",
        });
      }
    }
  });
}
