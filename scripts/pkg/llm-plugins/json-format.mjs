import { readFileSync } from "node:fs";
import { join } from "node:path";

const EXPORT_CONST_BRAND_PRIMARY_SHADES_AS_RE =
  /export const BRAND_PRIMARY_SHADES = \[([\s\S]*?)\] as const;/;
const EXPORT_CONST_BRAND_PRIMARY_COLOR_BRAND_RE =
  /export const BRAND_PRIMARY_COLOR(?::[^=]+)?\s*=\s*BRAND_PRIMARY_SHADES\[(\d+)\];/;
const FA_RE = /^#[0-9a-fA-F]{6}$/;

const PLUGIN_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json";
const MCP_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json";

function sortValue(value) {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))) {
      out[key] = sortValue(value[key]);
    }
    return out;
  }
  return value;
}

function object(entries) {
  const out = {};
  for (const [key, value] of entries) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    if (Array.isArray(value) && value.length === 0) {
      continue;
    }
    out[key] = value;
  }
  return out;
}

function channel(hex) {
  const value = Number.parseInt(hex, 16) / 255;
  return value <= 0.040_45 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function contrast(hex, background) {
  const luminance = (color) => {
    const body = color.slice(1);
    return (
      0.2126 * channel(body.slice(0, 2)) +
      0.7152 * channel(body.slice(2, 4)) +
      0.0722 * channel(body.slice(4, 6))
    );
  };
  const left = luminance(hex);
  const right = luminance(background);
  const lighter = Math.max(left, right);
  const darker = Math.min(left, right);
  return (lighter + 0.05) / (darker + 0.05);
}

export { object };

export function stringifyJson(value) {
  const pretty = JSON.stringify(sortValue(value), null, 2).replace(
    /^( *)("[^"]+": )\[\n((?: *"(?:\\.|[^"\\])*",?\n)+) *\]/gm,
    (match, indent, key, body) => {
      const items = [...body.matchAll(/"(?:\\.|[^"\\])*"/g)].map((item) => item[0]);
      const inline = `${indent}${key}[${items.join(", ")}]`;
      return inline.length <= 100 ? inline : match;
    },
  );
  return `${pretty}\n`;
}

/** `BRAND_PRIMARY_COLOR` from `packages/branding/src/colors.ts`. */
export function readBrandPrimaryColor(root) {
  const source = readFileSync(join(root, "packages/branding/src/colors.ts"), "utf8");
  const block = source.match(EXPORT_CONST_BRAND_PRIMARY_SHADES_AS_RE);
  const index = source.match(EXPORT_CONST_BRAND_PRIMARY_COLOR_BRAND_RE);
  const shades = block ? [...block[1].matchAll(/"(#[0-9a-fA-F]{6})"/g)].map((item) => item[1]) : [];
  const color = index ? shades[Number(index[1])] : undefined;
  if (!FA_RE.test(color ?? "")) {
    throw new Error("BRAND_PRIMARY_COLOR is missing in packages/branding/src/colors.ts.");
  }
  const normalized = color.toLowerCase();
  if (contrast(normalized, "#ffffff") < 2 || contrast(normalized, "#212121") < 2) {
    throw new Error(`${normalized} fails the 2:1 contrast rule on white or #212121.`);
  }
  return normalized;
}

export { MCP_SCHEMA, PLUGIN_SCHEMA };
