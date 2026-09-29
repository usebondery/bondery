import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bothHaveDefinedAvatars, hasMergeAvatarChoice } from "./hasMergeAvatarChoice.js";

describe("hasMergeAvatarChoice", () => {
  it("is false when neither contact has a defined avatar", () => {
    assert.equal(hasMergeAvatarChoice({ avatar: null }, { avatar: null }), false);
    assert.equal(hasMergeAvatarChoice({ avatar: "" }, { avatar: "  " }), false);
  });

  it("is false when a side is missing", () => {
    assert.equal(hasMergeAvatarChoice(null, { avatar: "https://cdn.example/a.jpg" }), false);
    assert.equal(hasMergeAvatarChoice({ avatar: "https://cdn.example/a.jpg" }, null), false);
  });

  it("is true when at least one contact has a defined avatar", () => {
    assert.equal(
      hasMergeAvatarChoice({ avatar: "https://cdn.example/a.jpg" }, { avatar: null }),
      true,
    );
    assert.equal(
      hasMergeAvatarChoice({ avatar: null }, { avatar: "https://cdn.example/b.jpg" }),
      true,
    );
    assert.equal(
      hasMergeAvatarChoice(
        { avatar: "https://cdn.example/a.jpg" },
        { avatar: "https://cdn.example/b.jpg" },
      ),
      true,
    );
  });
});

describe("bothHaveDefinedAvatars", () => {
  it("is true only when both sides have a photo", () => {
    assert.equal(
      bothHaveDefinedAvatars(
        { avatar: "https://cdn.example/a.jpg" },
        { avatar: "https://cdn.example/b.jpg" },
      ),
      true,
    );
    assert.equal(
      bothHaveDefinedAvatars({ avatar: "https://cdn.example/a.jpg" }, { avatar: null }),
      false,
    );
    assert.equal(bothHaveDefinedAvatars({ avatar: null }, { avatar: null }), false);
  });
});
