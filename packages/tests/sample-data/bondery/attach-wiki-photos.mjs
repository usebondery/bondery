/**
 * Attach Wikipedia portraits to notable sample contacts, then rebuild the
 * Bondery JSON export ZIP with avatars/{personId}.jpg.
 *
 * Usage:
 *   BONDERY_API_KEY=bondery_key_… node packages/tests/sample-data/bondery/attach-wiki-photos.mjs
 *
 * Dummy / fictional names are skipped. Photo upload is session-only on the API,
 * so this writes SeaweedFS + has_avatar directly, then copies JPEGs into the ZIP.
 */

import { readFileSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { Agent } from "node:https";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { resolveDevApiUrl } from "./dev-api.mjs";

/**
 * @param {unknown} value
 * @returns {unknown}
 */
function asUnknown(value) {
  return value;
}

const API_URL = resolveDevApiUrl();
const API_KEY = process.env.BONDERY_API_KEY;
const WIKI_UA = "BonderySampleData/1.0 (https://usebondery.com; team@usebondery.com)";
const AVATAR_MAX_EDGE = 512;
const WIKI_CONCURRENCY = 1;
const DOWNLOAD_MAX_ATTEMPTS = 6;

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "../../../..");
const OUT_DIR = path.join(SCRIPT_DIR, "export-files");
const AVATARS_DIR = path.join(OUT_DIR, "avatars");
const ZIP_PATH = path.join(SCRIPT_DIR, "bondery-sample-export.zip");
const PEOPLE_JSON = path.join(OUT_DIR, "people.json");

const apiRequire = createRequire(path.join(ROOT, "apps/api/package.json"));
const dbRequire = createRequire(path.join(ROOT, "packages/db/package.json"));
dbRequire("dotenv").config({ path: path.join(ROOT, ".env.local") });
dbRequire("dotenv").config({ path: path.join(ROOT, "apps/api/.env.development.local") });

const { S3Client, PutObjectCommand } = apiRequire("@aws-sdk/client-s3");
const sharp = apiRequire("sharp");
const AdmZip = apiRequire("adm-zip");
const { Pool } = dbRequire("pg");

const SKIP_NAMES = new Set([
  "Jane Doe",
  "John Smith",
  "Alex Rivera",
  "Sam Patel",
  "Jordan Lee",
  "Casey Nguyen",
  "Riley Okonkwo",
  "Morgan Chen",
  "Avery Schmidt",
  "Quinn Nakamura",
  "Taylor Brooks",
  "Jamie Ortega",
  "Robin Singh",
  "Drew Kim",
]);

const TITLE_OVERRIDES = {
  "Andrew Ng": ["Andrew_Ng"],
  "Edsger Dijkstra": ["Edsger_W._Dijkstra"],
  "Fei-Fei Li": ["Fei-Fei_Li"],
  "Frances Allen": ["Frances_Allen_(computer_scientist)", "Frances_Allen"],
  "Guido van Rossum": ["Guido_van_Rossum"],
  "John McCarthy": ["John_McCarthy_(computer_scientist)"],
  "John von Neumann": ["John_von_Neumann"],
  "Margaret Hamilton": ["Margaret_Hamilton_(software_engineer)"],
  "Tim Berners-Lee": ["Tim_Berners-Lee"],
  "Tony Hoare": ["C._A._R._Hoare", "Tony_Hoare"],
  "Whitney Wolfe Herd": ["Whitney_Wolfe_Herd"],
  "Yann LeCun": ["Yann_LeCun"],
};

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function fullName(contact) {
  return `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.replace(/\s+/g, " ").trim();
}

function titleCandidates(contact) {
  const name = fullName(contact);
  const fallback = `${contact.firstName}_${contact.lastName ?? ""}`.replaceAll(" ", "_");
  return [...new Set([...(TITLE_OVERRIDES[name] ?? []), fallback])];
}

async function mapPool(items, concurrency, worker) {
  const results = Array.from({ length: items.length });
  let next = 0;
  async function run() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => run()));
  return results;
}

async function api(method, pathname) {
  const response = await fetch(`${API_URL}${pathname}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    method,
  });
  const text = await response.text();
  const json = asUnknown(text ? JSON.parse(text) : null);
  if (!response.ok) {
    throw new Error(`${method} ${pathname} → ${response.status} ${text.slice(0, 300)}`);
  }
  return json;
}

async function listAllContacts() {
  const contacts = [];
  let offset = 0;
  const limit = 200;
  for (;;) {
    const page = await api("GET", `/contacts?limit=${limit}&offset=${offset}`);
    const rows = page.contacts ?? [];
    contacts.push(...rows);
    if (rows.length < limit) {
      break;
    }
    offset += limit;
  }
  return contacts;
}

async function wikiJson(url) {
  for (;;) {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": WIKI_UA,
      },
    });
    if (response.status === 429) {
      await sleep(2000);
      continue;
    }
    if (!response.ok) {
      return null;
    }
    return response.json();
  }
}

async function wikiThumbnailUrl(title) {
  const url = new URL("https://en.wikipedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("formatversion", "2");
  url.searchParams.set("redirects", "1");
  url.searchParams.set("prop", "pageimages|pageprops");
  url.searchParams.set("piprop", "thumbnail");
  url.searchParams.set("pithumbsize", "440");
  url.searchParams.set("titles", title.replaceAll("_", " "));
  const json = await wikiJson(url);
  const page = json?.query?.pages?.[0];
  if (!page || page.missing || page.invalid) {
    return null;
  }
  if (page.pageprops?.disambiguation !== null && page.pageprops?.disambiguation !== undefined) {
    return null;
  }
  return page.thumbnail?.source ?? null;
}

/** @type {Map<string, string | null>} */
const thumbnailCache = new Map();

async function thumbnailForContact(contact) {
  for (const title of titleCandidates(contact)) {
    if (thumbnailCache.has(title)) {
      const cached = asUnknown(thumbnailCache.get(title));
      if (typeof cached === "string") {
        return cached;
      }
      continue;
    }
    const imageUrl = await wikiThumbnailUrl(title);
    thumbnailCache.set(title, imageUrl);
    if (imageUrl) {
      return imageUrl;
    }
  }
  return null;
}

async function downloadJpeg(imageUrl) {
  let lastError = null;
  for (let attempt = 1; attempt <= DOWNLOAD_MAX_ATTEMPTS; attempt += 1) {
    const response = await fetch(imageUrl, {
      headers: { "User-Agent": WIKI_UA },
    });
    if (response.status === 429 || response.status >= 500) {
      lastError = new Error(`download ${imageUrl} → ${response.status}`);
      await sleep(Math.min(8000, 750 * 2 ** (attempt - 1)));
      continue;
    }
    if (!response.ok) {
      throw new Error(`download ${imageUrl} → ${response.status}`);
    }
    const input = Buffer.from(await response.arrayBuffer());
    return sharp(input)
      .rotate()
      .resize(AVATAR_MAX_EDGE, AVATAR_MAX_EDGE, { fit: "inside", withoutEnlargement: true })
      .jpeg({ mozjpeg: true, quality: 85 })
      .toBuffer();
  }
  throw lastError ?? new Error(`download ${imageUrl} failed`);
}

function createS3() {
  const accessKeyId = process.env.BONDERY_PRIVATE_S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.BONDERY_PRIVATE_S3_SECRET_ACCESS_KEY?.trim();
  const endpoint = process.env.BONDERY_PRIVATE_S3_ENDPOINT?.trim();
  const region = process.env.BONDERY_PRIVATE_S3_REGION?.trim();
  if (!accessKeyId || !secretAccessKey || !endpoint || !region) {
    return null;
  }
  // Local SeaweedFS uses TLS with a private CA (pnpm run start:seaweedfs). Paths in .env.local
  // are relative to apps/api, like every app that reads it.
  const caFile = process.env.BONDERY_PRIVATE_S3_TLS_CA_FILE?.trim();
  const ca = caFile ? readFileSync(path.resolve(ROOT, "apps/api", caFile), "utf8") : undefined;
  // An Agent, not agent options: the SDK drops options for uploads sent with Expect: 100-continue.
  const httpsAgent = ca ? new Agent({ ca, keepAlive: true, maxSockets: 50 }) : undefined;
  return new S3Client({
    credentials: { accessKeyId, secretAccessKey },
    endpoint,
    forcePathStyle: true,
    region,
    ...(httpsAgent ? { requestHandler: { httpsAgent } } : {}),
  });
}

async function main() {
  const contacts = (await listAllContacts()).filter((contact) => {
    if (contact.myself || contact.hasAvatar) {
      return false;
    }
    const name = fullName(contact);
    if (!contact.lastName || SKIP_NAMES.has(name)) {
      return false;
    }
    if (name.toLowerCase() === "maa") {
      return false;
    }
    return true;
  });

  console.log(`Notable contacts to try: ${contacts.length}`);

  const jpegByUrl = new Map();
  const attached = [];
  const skipped = [];

  await mapPool(contacts, WIKI_CONCURRENCY, async (contact) => {
    const name = fullName(contact);
    try {
      const imageUrl = await thumbnailForContact(contact);
      if (!imageUrl) {
        skipped.push(`${name} (no Wikipedia thumbnail)`);
        return;
      }
      if (!jpegByUrl.has(imageUrl)) {
        jpegByUrl.set(imageUrl, await downloadJpeg(imageUrl));
        await sleep(400);
      }
      attached.push({ contact, jpeg: jpegByUrl.get(imageUrl), name });
      console.log(`ok  ${name}`);
    } catch (error) {
      skipped.push(`${name} (${error instanceof Error ? error.message : String(error)})`);
      console.log(`skip ${name}: ${error instanceof Error ? error.message : error}`);
    }
  });

  await mkdir(AVATARS_DIR, { recursive: true });

  const s3 = createS3();
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null;
  if (!s3) {
    console.warn("S3 env missing — writing ZIP avatars only (local CRM photos will not update)");
  }
  if (!pool) {
    console.warn("DATABASE_URL missing — has_avatar will not be set");
  }

  const attachedIds = new Set();
  for (const { contact, jpeg } of attached) {
    await writeFile(path.join(AVATARS_DIR, `${contact.id}.jpg`), jpeg);
    attachedIds.add(contact.id);
    if (s3) {
      await s3.send(
        new PutObjectCommand({
          Body: jpeg,
          Bucket: "avatars",
          ContentType: "image/jpeg",
          Key: `${contact.userId}/${contact.id}.jpg`,
        }),
      );
    }
    if (pool) {
      await pool.query(
        `UPDATE people
         SET has_avatar = true, updated_at = NOW()
         WHERE id = $1::uuid AND user_id = $2::uuid`,
        [contact.id, contact.userId],
      );
    }
  }

  if (pool) {
    await pool.end();
  }

  const peoplePayload = JSON.parse(await readFile(PEOPLE_JSON, "utf8"));
  for (const person of peoplePayload.records ?? []) {
    if (attachedIds.has(person.id)) {
      person.hasAvatar = true;
    }
  }
  await writeFile(PEOPLE_JSON, `${JSON.stringify(peoplePayload, null, 2)}\n`, "utf8");

  const zip = new AdmZip();
  for (const name of await readdir(OUT_DIR)) {
    const fullPath = path.join(OUT_DIR, name);
    if (name === "avatars") {
      continue;
    }
    zip.addLocalFile(fullPath);
  }
  for (const fileName of await readdir(AVATARS_DIR)) {
    zip.addFile(`avatars/${fileName}`, await readFile(path.join(AVATARS_DIR, fileName)));
  }
  zip.writeZip(ZIP_PATH);

  console.log(`Attached photos: ${attached.length}`);
  if (skipped.length > 0) {
    console.log(`Skipped: ${skipped.length}`);
    for (const line of skipped.toSorted((a, b) => (a < b ? -1 : a > b ? 1 : 0))) {
      console.log(`  - ${line}`);
    }
  }
  console.log(`ZIP_PATH=${ZIP_PATH}`);
}

await main();
