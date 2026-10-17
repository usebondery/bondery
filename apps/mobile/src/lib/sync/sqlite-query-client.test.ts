import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getSqliteQueryClient, replaceSqliteQueryClient } from "./sqlite-query-client.ts";

describe("replaceSqliteQueryClient", () => {
  it("uses SQLite-safe query defaults", () => {
    const client = replaceSqliteQueryClient();
    const defaults = client.getQueryDefaults(["sqlite", "contacts"]);

    assert.equal(defaults.staleTime, Number.POSITIVE_INFINITY);
    assert.equal(defaults.retry, false);
    assert.equal(defaults.refetchOnWindowFocus, false);
    assert.equal(defaults.refetchOnReconnect, false);
    assert.equal(defaults.networkMode, "always");
    assert.equal(typeof defaults.gcTime, "number");
    assert.equal(Number.isFinite(defaults.gcTime), true);
  });

  it("isolates cached SQLite views between users", () => {
    const firstClient = replaceSqliteQueryClient();
    firstClient.setQueryData(["sqlite", "contacts", "list"], ["first-user"]);

    const secondClient = replaceSqliteQueryClient();

    assert.notEqual(secondClient, firstClient);
    assert.equal(getSqliteQueryClient(), secondClient);
    assert.equal(secondClient.getQueryData(["sqlite", "contacts", "list"]), undefined);
    assert.deepEqual(firstClient.getQueryData(["sqlite", "contacts", "list"]), ["first-user"]);
    firstClient.clear();
  });
});
