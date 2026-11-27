import { createHash } from "node:crypto";
import type { CardExtras, CardProjection } from "#carddav-projection.js";

const ETAG_HASH_LENGTH = 27;

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const entries = Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort((a, b) => (a < b ? -1 : 1))
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value);
}

/**
 * Deterministic JSON of a card: object keys sorted, lists in projection order.
 *
 * @param projection Canonical projection.
 * @param extras Device-owned extras.
 * @returns The same text for the same card, in every process.
 */
function canonicalJson(projection: CardProjection, extras: CardExtras): string {
  return stableStringify({
    extras: {
      namePrefix: extras.namePrefix,
      nameSuffix: extras.nameSuffix,
      properties: extras.properties.map((property) => ({
        group: property.group ?? null,
        name: property.name,
        parameters: property.parameters.map((parameter) => ({
          name: parameter.name,
          values: parameter.values,
        })),
        value: property.value,
      })),
    },
    projection,
  });
}

/**
 * Strong ETag of a card as one vCard version serves it. The photo version sits inside the
 * projection, so a new photo gives a new ETag.
 *
 * @param projection Canonical projection.
 * @param extras Device-owned extras.
 * @param vcardVersion Version of the served text.
 * @returns A quoted ETag such as `"3Qk...-3"`.
 */
function projectionEtag(
  projection: CardProjection,
  extras: CardExtras,
  vcardVersion: "3.0" | "4.0",
): string {
  const hash = createHash("sha256")
    .update(canonicalJson(projection, extras))
    .digest("base64url")
    .slice(0, ETAG_HASH_LENGTH);
  return `"${hash}-${vcardVersion === "3.0" ? "3" : "4"}"`;
}

export { canonicalJson, projectionEtag, stableStringify };
