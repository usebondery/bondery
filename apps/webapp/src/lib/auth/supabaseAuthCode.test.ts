import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isSupabaseAuthCode } from "./supabaseAuthCode.js";

describe("isSupabaseAuthCode", () => {
  it("accepts Supabase UUID auth codes", () => {
    assert.equal(isSupabaseAuthCode("abb068ec-a351-49c8-9376-40a34dbb206d"), true);
  });

  it("rejects GitHub-style hex codes", () => {
    assert.equal(isSupabaseAuthCode("7635f3950f176846252e"), false);
  });
});
