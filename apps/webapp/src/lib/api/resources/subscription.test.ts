import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canShowUsageReset } from "./subscription.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function status(overrides: {
  aiMonthlyResetAt: string | null;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd: string | null;
}) {
  return {
    aiMonthlyResetAt: overrides.aiMonthlyResetAt,
    cancelAtPeriodEnd: overrides.cancelAtPeriodEnd ?? false,
    currentPeriodEnd: overrides.currentPeriodEnd,
  };
}

describe("canShowUsageReset", () => {
  it("allows a reset inside a running period", () => {
    assert.equal(
      canShowUsageReset(
        status({
          aiMonthlyResetAt: new Date(Date.now() + 20 * DAY_MS).toISOString(),
          currentPeriodEnd: new Date(Date.now() + 20 * DAY_MS).toISOString(),
        }),
      ),
      true,
    );
  });

  it("refuses a reset when the plan ends at the next renewal", () => {
    // The reported bug: "will not renew on 14.12" above "resets on 31.12".
    assert.equal(
      canShowUsageReset(
        status({
          aiMonthlyResetAt: new Date(Date.now() + 38 * DAY_MS).toISOString(),
          cancelAtPeriodEnd: true,
          currentPeriodEnd: new Date(Date.now() + 21 * DAY_MS).toISOString(),
        }),
      ),
      false,
    );
  });

  it("refuses a reset that falls after the period end", () => {
    assert.equal(
      canShowUsageReset(
        status({
          aiMonthlyResetAt: new Date(Date.now() + 38 * DAY_MS).toISOString(),
          currentPeriodEnd: new Date(Date.now() + 21 * DAY_MS).toISOString(),
        }),
      ),
      false,
    );
  });

  it("refuses a reset when no reset instant exists", () => {
    assert.equal(
      canShowUsageReset(
        status({
          aiMonthlyResetAt: null,
          currentPeriodEnd: new Date(Date.now() + 21 * DAY_MS).toISOString(),
        }),
      ),
      false,
    );
  });

  it("allows a reset when Stripe has reported no period end yet", () => {
    assert.equal(
      canShowUsageReset(
        status({
          aiMonthlyResetAt: new Date(Date.now() + 20 * DAY_MS).toISOString(),
          currentPeriodEnd: null,
        }),
      ),
      true,
    );
  });

  it("allows a free account to show its reset date", () => {
    // A free account has no subscription row, so no period end and no cancel.
    assert.equal(
      canShowUsageReset(
        status({
          aiMonthlyResetAt: new Date(Date.now() + 20 * DAY_MS).toISOString(),
          currentPeriodEnd: null,
        }),
      ),
      true,
    );
  });
});
