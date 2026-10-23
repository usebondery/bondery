import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { refreshSqliteViews, type SqliteQueryMeta } from "./refresh-sqlite-views.ts";

function makeClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: Number.POSITIVE_INFINITY,
        retry: false,
        staleTime: Number.POSITIVE_INFINITY,
      },
    },
  });
}

describe("refreshSqliteViews", () => {
  it("rereads active matching views in the same turn", async () => {
    const client = makeClient();
    const queryKey = ["sqlite", "contacts", "detail", "person-1"] as const;
    let sqliteValue = "before";
    const sqliteRead = () => sqliteValue;
    const meta = { sqliteRead } satisfies SqliteQueryMeta;

    await client.prefetchQuery({ meta, queryFn: sqliteRead, queryKey });
    const observer = new QueryObserver(client, { meta, queryFn: sqliteRead, queryKey });
    const unsubscribe = observer.subscribe(() => {});

    sqliteValue = "after";
    refreshSqliteViews(["people"], client);

    assert.equal(client.getQueryData(queryKey), "after");
    unsubscribe();
  });

  it("drops inactive matching views and rereads SQLite on mount", async () => {
    const client = makeClient();
    const queryKey = ["sqlite", "tags", "list"] as const;
    let readCount = 0;
    let sqliteValue = "before";
    const sqliteRead = () => {
      readCount += 1;
      return [sqliteValue];
    };

    await client.prefetchQuery({
      meta: { sqliteRead } satisfies SqliteQueryMeta,
      queryFn: sqliteRead,
      queryKey,
    });
    readCount = 0;
    sqliteValue = "after";

    refreshSqliteViews(["tags"], client);

    assert.equal(readCount, 0);
    assert.equal(client.getQueryCache().find({ queryKey }), undefined);

    const observer = new QueryObserver(client, {
      initialData: sqliteRead,
      meta: { sqliteRead } satisfies SqliteQueryMeta,
      queryFn: sqliteRead,
      queryKey,
    });

    assert.deepEqual(observer.getCurrentResult().data, ["after"]);
    assert.equal(readCount, 1);
  });

  it("rereads a disabled observed view when bootstrap enables it", () => {
    const client = makeClient();
    const queryKey = ["sqlite", "contacts", "list"] as const;
    let sqliteValue = "before";
    const sqliteRead = () => sqliteValue;
    const options = {
      enabled: false,
      initialData: sqliteRead,
      meta: { sqliteRead } satisfies SqliteQueryMeta,
      queryFn: sqliteRead,
      queryKey,
    };
    const observer = new QueryObserver(client, options);
    const unsubscribe = observer.subscribe(() => {});

    sqliteValue = "after";
    refreshSqliteViews(["people"], client);
    observer.setOptions({ ...options, enabled: true });

    assert.equal(observer.getCurrentResult().data, "after");
    unsubscribe();
  });

  it("reports active SQLite read failures without retaining stale data", async () => {
    const client = makeClient();
    const queryKey = ["sqlite", "contacts", "detail", "person-1"] as const;
    let shouldFail = false;
    const sqliteRead = () => {
      if (shouldFail) {
        throw new Error("SQLite read failed");
      }
      return "before";
    };
    const meta = { sqliteRead } satisfies SqliteQueryMeta;

    await client.prefetchQuery({ meta, queryFn: sqliteRead, queryKey });
    const observer = new QueryObserver(client, { meta, queryFn: sqliteRead, queryKey });
    const unsubscribe = observer.subscribe(() => {});

    shouldFail = true;
    refreshSqliteViews(["people"], client);

    const query = client.getQueryCache().find({ queryKey });
    assert.equal(query?.state.data, undefined);
    assert.equal(query?.state.error?.message, "SQLite read failed");
    assert.equal(query?.state.status, "error");

    shouldFail = false;
    refreshSqliteViews(["people"], client);
    assert.equal(query?.state.data, "before");
    assert.equal(query?.state.error, null);
    assert.equal(query?.state.status, "success");
    unsubscribe();
  });

  it("refreshes contact views for group membership changes", async () => {
    const client = makeClient();
    const contactsKey = ["sqlite", "contacts", "list"] as const;
    const tagsKey = ["sqlite", "tags", "list"] as const;
    let contacts = 0;
    let tags = 0;
    const contactsRead = () => ++contacts;
    const tagsRead = () => ++tags;

    await Promise.all([
      client.prefetchQuery({
        meta: { sqliteRead: contactsRead } satisfies SqliteQueryMeta,
        queryFn: contactsRead,
        queryKey: contactsKey,
      }),
      client.prefetchQuery({
        meta: { sqliteRead: tagsRead } satisfies SqliteQueryMeta,
        queryFn: tagsRead,
        queryKey: tagsKey,
      }),
    ]);
    const observer = new QueryObserver(client, {
      meta: { sqliteRead: contactsRead } satisfies SqliteQueryMeta,
      queryFn: contactsRead,
      queryKey: contactsKey,
    });
    const unsubscribe = observer.subscribe(() => {});

    refreshSqliteViews(["people_groups"], client);

    assert.equal(client.getQueryData(contactsKey), 2);
    assert.equal(client.getQueryData(tagsKey), 1);
    unsubscribe();
  });
});
