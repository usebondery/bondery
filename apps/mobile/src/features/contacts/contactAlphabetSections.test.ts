import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Contact } from "@bondery/schemas";
import {
  buildAlphabetContactSections,
  getContactSectionLetter,
} from "./contactAlphabetSections.ts";

function contact(firstName: string, id = firstName): Contact {
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

describe("getContactSectionLetter", () => {
  it("keeps Czech Š as its own letter", () => {
    assert.equal(getContactSectionLetter(contact("Šárka"), "cs"), "Š");
  });

  it("uppercases Czech č to Č", () => {
    assert.equal(getContactSectionLetter(contact("čaj"), "cs"), "Č");
  });

  it("puts non-letters in #", () => {
    assert.equal(getContactSectionLetter(contact("7-Eleven"), "cs"), "#");
  });
});

describe("buildAlphabetContactSections", () => {
  it("orders Š after S and before T in Czech", () => {
    const sections = buildAlphabetContactSections(
      [contact("Tomáš", "t"), contact("Šárka", "s-caron"), contact("Sára", "s")],
      "cs",
    );

    assert.deepEqual(
      sections.map((section) => section.title),
      ["S", "Š", "T"],
    );
  });

  it("orders Č after C in Czech", () => {
    const sections = buildAlphabetContactSections(
      [contact("Čestmír", "c-caron"), contact("Cyril", "c")],
      "cs",
    );

    assert.deepEqual(
      sections.map((section) => section.title),
      ["C", "Č"],
    );
  });
});
