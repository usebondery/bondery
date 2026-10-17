import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Contact } from "@bondery/schemas";
import { filterMentionContacts } from "../../../features/contacts/hooks/filterMentionContacts.ts";
import {
  buildContactIdsSelectSql,
  buildContactNamesByIdsSelectSql,
  buildContactsListSelectSql,
  listContactNotesFields,
} from "../../resources/contacts-list-sql.ts";

describe("buildContactsListSelectSql", () => {
  it("omits LIMIT when limit is absent", () => {
    const { sql, params } = buildContactsListSelectSql({ query: "ada" });

    assert.equal(/LIMIT/i.test(sql), false);
    assert.equal(/OFFSET/i.test(sql), false);
    assert.deepEqual(params, ["%ada%", "%ada%", "%ada%"]);
  });

  it("includes LIMIT when limit is set", () => {
    const { sql, params } = buildContactsListSelectSql({ limit: 8, query: "ada" });

    assert.equal(/LIMIT \? OFFSET \?/.test(sql), true);
    assert.deepEqual(params, ["%ada%", "%ada%", "%ada%", 8, 0]);
  });

  it("selects lean columns instead of notes or p.*", () => {
    const { sql } = buildContactsListSelectSql({});

    assert.equal(sql.includes("p.*"), false);
    assert.equal(/\bnotes\b/.test(sql), false);
    assert.equal(/\bnotes_updated_at\b/.test(sql), false);
    assert.equal(sql.includes("p.avatar_updated_at"), true);
    assert.equal(sql.startsWith("SELECT DISTINCT p.id, p.user_id"), true);
  });
});

describe("buildContactIdsSelectSql", () => {
  it("selects ids only", () => {
    const { sql } = buildContactIdsSelectSql({ limit: 8 });
    const selectClause = sql.slice(0, sql.indexOf(" FROM "));

    assert.equal(selectClause, "SELECT DISTINCT p.id");
    assert.equal(selectClause.includes("p.*"), false);
    assert.equal(/LIMIT \? OFFSET \?/.test(sql), true);
  });
});

describe("buildContactNamesByIdsSelectSql", () => {
  it("returns null when there are no ids", () => {
    assert.equal(buildContactNamesByIdsSelectSql([]), null);
    assert.equal(buildContactNamesByIdsSelectSql(["", ""]), null);
  });

  it("builds one IN query and drops duplicate ids", () => {
    const query = buildContactNamesByIdsSelectSql(["a", "b", "a"]);

    assert.equal(
      query?.sql,
      "SELECT id, first_name, middle_name, last_name FROM people WHERE id IN (?, ?)",
    );
    assert.deepEqual(query?.params, ["a", "b"]);
  });
});

describe("listContactNotesFields", () => {
  it("maps a lean row without notes to null notes fields", () => {
    const mapped = listContactNotesFields({});

    assert.equal(mapped.notes, null);
    assert.equal(mapped.notesUpdatedAt, null);
  });
});

describe("filterMentionContacts", () => {
  it("returns at most 8 contacts", () => {
    const contacts = Array.from({ length: 12 }, (_, index) =>
      mentionContact(`id-${index}`, `Name${index}`),
    );

    assert.equal(filterMentionContacts(contacts, "").length, 8);
    assert.equal(filterMentionContacts(contacts, "Name").length, 8);
  });
});

function mentionContact(id: string, firstName: string): Contact {
  return {
    avatar: null,
    createdAt: "2020-01-01T00:00:00.000Z",
    emails: null,
    facebook: null,
    firstName,
    gisPoint: null,
    headline: null,
    id,
    instagram: null,
    keepFrequencyDays: null,
    language: null,
    lastInteraction: null,
    lastInteractionActivityId: null,
    lastName: null,
    latitude: null,
    linkedin: null,
    location: null,
    longitude: null,
    middleName: null,
    myself: false,
    notes: null,
    phones: null,
    signal: null,
    timezone: null,
    updatedAt: "2020-01-01T00:00:00.000Z",
    userId: "user-1",
    website: null,
    whatsapp: null,
  };
}
