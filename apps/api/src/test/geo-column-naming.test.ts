/**
 * Geo columns are case-sensitive camelCase, not snake_case.
 *
 * Prisma models `gisPoint` as `Unsupported("geography(Point,4326)")`, so the
 * column is created quoted and keeps its camelCase name. Raw SQL that writes
 * `gis_point` fails with 42703 `column "gis_point" does not exist`. Most call
 * sites catch and log that error, so coordinates were dropped silently.
 *
 * This test pins the real column name and proves both write paths succeed.
 */
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { prisma } from "@bondery/db";
import { generateId } from "@bondery/helpers/ids";
import { loadTestEnv } from "./load-test-env.js";

loadTestEnv();

const { setGisPoint } = await import("../domains/me/import-helpers.js");

describe("geo column naming", () => {
  const userId = generateId();
  const personId = generateId();
  const addressId = generateId();

  before(async () => {
    await prisma.user.create({
      data: { email: `geo-${userId}@example.test`, emailVerified: true, id: userId, name: "Geo" },
    });
    await prisma.people.create({
      data: { firstName: "Ada", id: personId, userId },
    });
    await prisma.peopleAddress.create({
      data: { id: addressId, personId, userId, value: "Test street 1" },
    });
  });

  after(async () => {
    await prisma.peopleAddress.deleteMany({ where: { userId } });
    await prisma.people.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  it("exposes gisPoint, not gis_point, on both geo tables", async () => {
    const rows = await prisma.$queryRaw<{ column_name: string; table_name: string }[]>`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('people', 'people_addresses')
        AND column_name ILIKE '%gis%'
      ORDER BY table_name
    `;

    assert.deepEqual(
      rows.map((row) => `${row.table_name}.${row.column_name}`),
      ["people.gisPoint", "people_addresses.gisPoint"],
    );
  });

  it("writes a point to people without error", async () => {
    await setGisPoint(prisma, "people", personId, userId, 52.52, 13.405);

    const [row] = await prisma.$queryRaw<{ lat: number | null; lng: number | null }[]>`
      SELECT ST_Y("gisPoint"::geometry) AS lat, ST_X("gisPoint"::geometry) AS lng
      FROM people
      WHERE id = ${personId}::uuid
    `;

    assert.ok(row, "person row should exist");
    assert.equal(Number(row.lat), 52.52);
    assert.equal(Number(row.lng), 13.405);
  });

  it("writes a point to people_addresses without error", async () => {
    await setGisPoint(prisma, "people_addresses", addressId, userId, 48.137, 11.575);

    const [row] = await prisma.$queryRaw<{ lat: number | null }[]>`
      SELECT ST_Y("gisPoint"::geometry) AS lat
      FROM people_addresses
      WHERE id = ${addressId}::uuid
    `;

    assert.ok(row, "address row should exist");
    assert.equal(Number(row.lat), 48.137);
  });
});
