import AdmZip from "adm-zip";
import { parse as parseCsv } from "csv-parse/sync";
import type { LinkedInPreparedContact } from "@bondery/types";

const LINKEDIN_REQUIRED_HEADERS = [
  "First Name",
  "Last Name",
  "URL",
  "Email Address",
  "Company",
  "Position",
  "Connected On",
] as const;

const LINKEDIN_HEADER_SIGNATURE = LINKEDIN_REQUIRED_HEADERS.join(",").toLowerCase();

type UploadFile = {
  fileName: string;
  content: Buffer;
};

type RawLinkedInCsvRow = {
  "First Name": string;
  "Last Name": string;
  URL: string;
  "Email Address": string;
  Company: string;
  Position: string;
  "Connected On": string;
};

const NAME_TITLE_TOKENS = new Set([
  "doc",
  "doc.",
  "ing",
  "ing.",
  "bc",
  "bc.",
  "mgr",
  "mgr.",
  "judr",
  "judr.",
  "mudr",
  "mudr.",
  "rndr",
  "rndr.",
  "phdr",
  "phdr.",
  "phd",
  "ph.d",
  "ph.d.",
  "dphil",
  "dr",
  "dr.",
  "prof",
  "prof.",
  "mba",
  "ma",
  "msc",
  "bsc",
  "cpa",
  "esq",
  "esq.",
  "jd",
  "md",
  "dds",
]);

function normalizeHeader(value: string): string {
  return value.replace(/^\uFEFF/, "").trim();
}

function normalizeNullableString(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeNameToken(token: string): string {
  return token.trim().replace(/,$/, "").toLowerCase();
}

function stripNameTitles(rawName: string): string {
  const words = rawName.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return "";
  }

  let start = 0;
  let end = words.length - 1;

  while (start <= end && NAME_TITLE_TOKENS.has(normalizeNameToken(words[start]))) {
    start += 1;
  }

  while (end >= start && NAME_TITLE_TOKENS.has(normalizeNameToken(words[end]))) {
    end -= 1;
  }

  return words
    .slice(start, end + 1)
    .join(" ")
    .trim();
}

function extractNameParts(lastNameInput: string): { middleName: string | null; lastName: string } {
  const normalized = normalizeNullableString(lastNameInput) || "";
  const words = normalized.split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return { middleName: null, lastName: "" };
  }

  if (words.length === 1) {
    return { middleName: null, lastName: words[0] };
  }

  return {
    middleName: words[words.length - 2],
    lastName: words[words.length - 1],
  };
}

function parseLinkedInUsername(rawUrl: string): { username: string | null; normalizedUrl: string } {
  const fallback = normalizeNullableString(rawUrl) || "";

  if (!fallback) {
    return { username: null, normalizedUrl: "" };
  }

  try {
    const withProtocol = /^https?:\/\//i.test(fallback) ? fallback : `https://${fallback}`;
    const parsed = new URL(withProtocol);
    const segments = parsed.pathname.split("/").filter(Boolean);

    let username: string | null = null;
    const inIndex = segments.findIndex((segment) => segment.toLowerCase() === "in");

    if (inIndex >= 0 && segments[inIndex + 1]) {
      username = segments[inIndex + 1];
    } else if (segments.length > 0) {
      username = segments[segments.length - 1];
    }

    const cleaned =
      normalizeNullableString(username?.replace(/\?.*$/, "").replace(/#.*$/, "")) || null;

    if (!cleaned) {
      return { username: null, normalizedUrl: fallback };
    }

    return {
      username: cleaned,
      normalizedUrl: `https://www.linkedin.com/in/${cleaned}`,
    };
  } catch {
    return { username: null, normalizedUrl: fallback };
  }
}

function parseConnectedOn(value: string): string | null {
  const normalized = normalizeNullableString(value);
  if (!normalized) {
    return null;
  }

  const directDate = new Date(normalized);
  if (!Number.isNaN(directDate.getTime())) {
    return directDate.toISOString();
  }

  const slashParts = normalized.split("/");
  if (slashParts.length === 3) {
    const [first, second, third] = slashParts;
    const month = Number(first);
    const day = Number(second);
    const year = Number(third);

    if (
      Number.isInteger(month) &&
      Number.isInteger(day) &&
      Number.isInteger(year) &&
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= 31
    ) {
      return new Date(Date.UTC(year, month - 1, day)).toISOString();
    }
  }

  return null;
}

function getConnectionsCsvContent(files: UploadFile[]): string {
  const zipFile = files.find((file) => file.fileName.toLowerCase().endsWith(".zip"));

  if (zipFile) {
    const zip = new AdmZip(zipFile.content);
    const entry = zip
      .getEntries()
      .find(
        (item: { isDirectory: boolean; entryName: string }) =>
          !item.isDirectory && item.entryName.toLowerCase().endsWith("connections.csv"),
      );

    if (!entry) {
      throw new Error("Connections.csv was not found in the ZIP file");
    }

    return entry.getData().toString("utf8");
  }

  const csvFile = files.find((file) => file.fileName.toLowerCase().endsWith("connections.csv"));
  if (!csvFile) {
    throw new Error("Connections.csv was not found in uploaded files");
  }

  return csvFile.content.toString("utf8");
}

function validateLinkedInHeaders(headers: string[]): void {
  const normalizedHeaders = headers.map(normalizeHeader);
  const isValid =
    normalizedHeaders.length === LINKEDIN_REQUIRED_HEADERS.length &&
    LINKEDIN_REQUIRED_HEADERS.every(
      (header, index) => normalizeHeader(header) === normalizedHeaders[index],
    );

  if (!isValid) {
    throw new Error(
      `Invalid LinkedIn CSV format. Expected headers: ${LINKEDIN_REQUIRED_HEADERS.join(", ")}`,
    );
  }
}

function extractLinkedInCsvDataSection(csvContent: string): string {
  const normalizedContent = csvContent.replace(/^\uFEFF/, "");
  const lines = normalizedContent.split(/\r?\n/);

  const headerIndex = lines.findIndex((line) => {
    const normalizedLine = line
      .replace(/^\uFEFF/, "")
      .trim()
      .toLowerCase();
    return normalizedLine === LINKEDIN_HEADER_SIGNATURE;
  });

  if (headerIndex < 0) {
    throw new Error(
      `Invalid LinkedIn CSV format. Expected headers: ${LINKEDIN_REQUIRED_HEADERS.join(", ")}`,
    );
  }

  return lines.slice(headerIndex).join("\n");
}

export function parseLinkedInCsvUpload(files: UploadFile[]): LinkedInPreparedContact[] {
  if (files.length === 0) {
    throw new Error("No files uploaded");
  }

  const csvContent = getConnectionsCsvContent(files);

  const csvDataSection = extractLinkedInCsvDataSection(csvContent);

  const parsedRows = parseCsv(csvDataSection, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as RawLinkedInCsvRow[];

  if (!Array.isArray(parsedRows)) {
    throw new Error("Failed to parse CSV content");
  }

  const firstRow = parsedRows[0] as Record<string, unknown> | undefined;
  if (firstRow) {
    validateLinkedInHeaders(Object.keys(firstRow));
  }

  return parsedRows.map((row, index) => {
    const firstName = stripNameTitles(normalizeNullableString(row["First Name"]) || "");
    const nameParts = extractNameParts(stripNameTitles(row["Last Name"] || ""));
    const { username: linkedinUsername, normalizedUrl } = parseLinkedInUsername(row.URL || "");
    const email = normalizeNullableString(row["Email Address"]);
    const company = normalizeNullableString(row.Company);
    const position = normalizeNullableString(row.Position);
    const connectedOnRaw = normalizeNullableString(row["Connected On"]);
    const connectedAt = parseConnectedOn(row["Connected On"] || "");

    const issues: string[] = [];

    if (!firstName) {
      issues.push("Missing first name");
    }

    if (!nameParts.lastName) {
      issues.push("Missing last name");
    }

    if (!linkedinUsername) {
      issues.push("Missing LinkedIn username in URL");
    }

    return {
      tempId: `linkedin-row-${index + 1}`,
      firstName,
      middleName: nameParts.middleName,
      lastName: nameParts.lastName,
      linkedinUrl: normalizedUrl,
      linkedinUsername: linkedinUsername || "",
      alreadyExists: false,
      email,
      company,
      position,
      connectedAt,
      connectedOnRaw,
      isValid: issues.length === 0,
      issues,
    };
  });
}
