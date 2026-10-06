import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractVoyagerBio, extractVoyagerIdentity } from "./profileIdentity";

describe("extractVoyagerIdentity", () => {
  it("reads first and last name from a dash Profile entity", () => {
    const identity = extractVoyagerIdentity(
      [
        {
          $type: "com.linkedin.voyager.dash.identity.profile.Profile",
          firstName: "Jakub",
          headline: "CTO",
          lastName: "Žemlička",
          publicIdentifier: "jakub-žemlička-50779a201",
        },
      ],
      "jakub-žemlička-50779a201",
      null,
    );

    assert.deepEqual(identity, {
      firstName: "Jakub",
      fullName: "Jakub Žemlička",
      headline: "CTO",
      lastName: "Žemlička",
    });
  });

  it("ignores a Profile whose firstName is the vanity slug", () => {
    const identity = extractVoyagerIdentity(
      [
        {
          $type: "com.linkedin.voyager.dash.identity.profile.Profile",
          firstName: "jakub-žemlička-50779a201",
          publicIdentifier: "jakub-žemlička-50779a201",
        },
      ],
      "jakub-žemlička-50779a201",
      null,
    );

    assert.equal(identity, null);
  });

  it("reads MiniProfile when the full Profile has no name", () => {
    const identity = extractVoyagerIdentity(
      [
        {
          $type: "com.linkedin.voyager.dash.identity.profile.MiniProfile",
          firstName: "Jakub",
          lastName: "Žemlička",
          publicIdentifier: "jakub-žemlička-50779a201",
        },
      ],
      "jakub-žemlička-50779a201",
      null,
    );

    assert.equal(identity?.firstName, "Jakub");
    assert.equal(identity?.lastName, "Žemlička");
  });
});

describe("extractVoyagerBio", () => {
  it("reads summary from a matching Profile entity", () => {
    const bio = extractVoyagerBio(
      [
        {
          $type: "com.linkedin.voyager.dash.identity.profile.Profile",
          publicIdentifier: "jakub-žemlička-50779a201",
          summary: "Builds CRM software for personal networks.",
        },
      ],
      "jakub-žemlička-50779a201",
      null,
    );

    assert.equal(bio, "Builds CRM software for personal networks.");
  });

  it("reads multiLocaleSummary when summary is missing", () => {
    const bio = extractVoyagerBio(
      [
        {
          $type: "com.linkedin.voyager.dash.identity.profile.Profile",
          multiLocaleSummary: { en_US: "Writes about math." },
          publicIdentifier: "jane-doe",
        },
      ],
      "jane-doe",
      null,
    );

    assert.equal(bio, "Writes about math.");
  });

  it("reads a ProfileAbout entity when Profile has no summary", () => {
    const bio = extractVoyagerBio(
      [
        {
          $type: "com.linkedin.voyager.dash.identity.profile.ProfileAbout",
          text: "Former founder. Now building Bondery.",
        },
      ],
      "jane-doe",
      null,
    );

    assert.equal(bio, "Former founder. Now building Bondery.");
  });

  it("reads summary from a dash Profile in elements with no $type", () => {
    const bio = extractVoyagerBio(
      [
        {
          entityUrn: "urn:li:fsd_profile:ACoAAABbCU8BZ1u7ldnivR0qeqOY0lnnhiyUDsw",
          summary: "About text from dash profiles elements.",
        },
      ],
      "jane-doe",
      "urn:li:fsd_profile:ACoAAABbCU8BZ1u7ldnivR0qeqOY0lnnhiyUDsw",
    );

    assert.equal(bio, "About text from dash profiles elements.");
  });

  it("reads summary from a classic fs_profile without $type", () => {
    const bio = extractVoyagerBio(
      [
        {
          entityUrn: "urn:li:fs_profile:ACoAAABbCU8BZ1u7ldnivR0qeqOY0lnnhiyUDsw",
          publicIdentifier: "jane-doe",
          summary: "Classic Voyager About text.",
        },
      ],
      "jane-doe",
      null,
    );

    assert.equal(bio, "Classic Voyager About text.");
  });

  it("reads summary nested under profileStatefulProfileFields", () => {
    const bio = extractVoyagerBio(
      [
        {
          $type: "com.linkedin.voyager.dash.identity.profile.Profile",
          profileStatefulProfileFields: {
            summary: "About lives on stateful fields.",
          },
          publicIdentifier: "jane-doe",
        },
      ],
      "jane-doe",
      null,
    );

    assert.equal(bio, "About lives on stateful fields.");
  });

  it("reads expandable About tetris text when Profile has no summary", () => {
    const bio = extractVoyagerBio(
      [
        {
          $id: "urn:li:fsd_profile:ACoAAAAboutTopLevelSection",
          $type: "com.linkedin.voyager.dash.identity.profile.tetris.Card",
          topComponents: [
            {
              components: {
                expandableTextComponent: {
                  description: {
                    text: "I help operators keep their personal network in one place.",
                  },
                },
              },
            },
          ],
        },
      ],
      "jane-doe",
      null,
    );

    assert.equal(bio, "I help operators keep their personal network in one place.");
  });

  it("does not take another profile summary when the viewee Profile has none", () => {
    const bio = extractVoyagerBio(
      [
        {
          $type: "com.linkedin.voyager.dash.identity.profile.Profile",
          firstName: "Jane",
          publicIdentifier: "jane-doe",
        },
        {
          $type: "com.linkedin.voyager.dash.identity.profile.Profile",
          publicIdentifier: "the-viewer",
          summary: "Viewer about that must not leak.",
        },
      ],
      "jane-doe",
      null,
    );

    assert.equal(bio, undefined);
  });

  it("does not throw when publicIdentifier is not a string", () => {
    const bio = extractVoyagerBio(
      [
        {
          publicIdentifier: { vanityName: "jane-doe" },
          summary: "Must not throw or match.",
        },
        {
          $type: "com.linkedin.voyager.dash.identity.profile.Profile",
          publicIdentifier: "jane-doe",
          summary: "Real about.",
        },
      ],
      "jane-doe",
      null,
    );

    assert.equal(bio, "Real about.");
  });
});
