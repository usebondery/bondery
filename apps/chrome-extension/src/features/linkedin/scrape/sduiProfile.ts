/**
 * LinkedIn SDUI (Server-Driven UI) profile DOM scraper.
 *
 * Anchors on stable `componentkey` attributes instead of legacy selectors
 * (data-member-id, #experience, data-field="experience_company_logo").
 */

import { pollUntil } from "../pollUntil";
import type { EducationEntry } from "./education";
import { parseDateRange, type WorkEntry } from "./workExperience";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SduiIdentity {
  firstName: string;
  fullName: string;
  headline?: string;
  lastName?: string;
  middleName?: string;
  profilePhotoUrl?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const EMPLOYMENT_TYPES = new Set([
  "Full-time",
  "Part-time",
  "Self-employed",
  "Freelance",
  "Contract",
  "Internship",
  "Apprenticeship",
  "Seasonal",
]);

const CONNECTION_BADGE = /^·\s*[\d.]+\s*(st|nd|rd|th)?\.?$/i;
const NOISE = /^(…|more|\.{3})$/i;
const SKILLS_LINE = /\bskills?\b|\+\d+\s+skills/i;
const MUTUAL_CONNECTIONS =
  /\bmutual connections?\b|vzájemn(á|é|ých)? spojení|společn(ých|é) spojení|\band \d+ other\b/i;
const SOCIAL_PROOF_LINE = /followers|connections|sledujících|spojení|sledující/i;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDoc(doc?: Document): Document {
  return doc ?? document;
}

function text(el: Element | null | undefined): string {
  return (el?.textContent ?? "").replace(/\s+/g, " ").trim();
}

function stripLogo(s: string): string {
  return s.replace(/\s+logo\s*$/i, "").trim();
}

function isDateText(t: string): boolean {
  return (
    /\b(19[7-9]\d|20[0-3]\d)\b/.test(t) && (/[–—·-]/.test(t) || /^\s*(19|20)\d{2}\s*$/.test(t))
  );
}

function orgId(
  href: string | undefined,
  kind: "company" | "school" = "company",
): string | undefined {
  if (!href) {
    return undefined;
  }
  const re =
    kind === "school"
      ? /linkedin\.com\/school\/([^/?#]+)/i
      : /linkedin\.com\/(?:company|school|organization|showcase)\/([^/?#]+)/i;
  return href.match(re)?.[1]?.toLowerCase();
}

function splitCompanyLine(line: string): { companyName: string; employmentType?: string } {
  const parts = line.split(" · ");
  const last = parts.length > 0 ? parts[parts.length - 1] : undefined;
  if (parts.length >= 2 && last && EMPLOYMENT_TYPES.has(last)) {
    return { companyName: parts.slice(0, -1).join(" · "), employmentType: last };
  }
  return { companyName: line };
}

function leafTexts(root: Element): string[] {
  return [...root.querySelectorAll("p, span")]
    .filter((el) => el.children.length === 0)
    .map((el) => text(el))
    .filter(Boolean)
    .filter((t, i, a) => a.indexOf(t) === i)
    .filter((t) => !NOISE.test(t) && !SKILLS_LINE.test(t));
}

// ─── Detection ───────────────────────────────────────────────────────────────

export function isSduiProfile(doc?: Document): boolean {
  return !!getDoc(doc).querySelector('[componentkey*="Topcard"]');
}

export function getTopcard(doc?: Document): Element | null {
  const cards = [...getDoc(doc).querySelectorAll('[componentkey*="Topcard"]')];
  if (cards.length === 0) {
    return null;
  }

  const withPersonName = cards.find((card) => {
    const name =
      text(card.querySelector("h1")) ||
      text(card.querySelector("h2")) ||
      text(card.querySelector('[data-anonymize="person-name"]'));
    return Boolean(name && /\s/.test(name));
  });

  return withPersonName ?? cards[0] ?? null;
}

/**
 * Parses the fsd_profile URN from an SDUI `componentkey` attribute value.
 * e.g. "…refACoAAABbCU8BZ1u7ldnivR0qeqOY0lnnhiyUDswTopcard"
 *   → urn:li:fsd_profile:ACoAAABbCU8BZ1u7ldnivR0qeqOY0lnnhiyUDsw
 */
export function parseFsdProfileUrnFromComponentKey(key: string | null | undefined): string | null {
  if (!key) {
    return null;
  }

  const withSuffix = key.match(
    /ref(ACo[A-Za-z0-9_-]+?)(?:Topcard|About|Experience|Education|Featured|Services|$)/,
  );
  if (withSuffix?.[1]) {
    return `urn:li:fsd_profile:${withSuffix[1]}`;
  }

  const embeddedUrn = key.match(/urn:li:fsd_profile:(ACo[A-Za-z0-9_-]+)/);
  if (embeddedUrn?.[1]) {
    return `urn:li:fsd_profile:${embeddedUrn[1]}`;
  }

  const bareAco = key.match(/(ACo[A-Za-z0-9_-]{20,})/);
  if (bareAco?.[1]) {
    return `urn:li:fsd_profile:${bareAco[1]}`;
  }

  return null;
}

/**
 * Parses the fsd_profile URN from the topcard componentkey.
 */
export function extractProfileUrnFromComponentKey(doc?: Document): string | null {
  const topcard = getTopcard(doc);
  return parseFsdProfileUrnFromComponentKey(topcard?.getAttribute("componentkey"));
}

// ─── Identity ────────────────────────────────────────────────────────────────

/**
 * True when `value` is a LinkedIn vanity slug (the URL handle), not a display name.
 * LinkedIn auto-handles look like `jakub-žemlička-50779a201`.
 */
export function looksLikeLinkedInVanityHandle(value: string, handle?: string): boolean {
  const normalized = value.normalize("NFC").trim();
  if (!normalized) {
    return true;
  }
  if (handle && normalized.toLowerCase() === handle.normalize("NFC").trim().toLowerCase()) {
    return true;
  }
  if (/\s/.test(normalized)) {
    return false;
  }
  const lastSegment = normalized.split("-").pop() ?? "";
  return /^[a-f0-9]{8,12}$/i.test(lastSegment) && /\d/.test(lastSegment);
}

function titleCaseHandleToken(token: string): string {
  const chars = [...token];
  const first = chars.shift();
  if (!first) {
    return token;
  }
  return first.toLocaleUpperCase() + chars.join("").toLocaleLowerCase();
}

/**
 * Last-resort name from a LinkedIn vanity handle when DOM/Voyager identity is missing.
 * `jakub-žemlička-50779a201` → Jakub / Žemlička.
 */
export function displayNameFromLinkedInHandle(handle: string): {
  firstName: string;
  lastName?: string;
  middleName?: string;
} | null {
  let decoded = handle;
  try {
    decoded = decodeURIComponent(handle);
  } catch {
    // Keep the raw handle when it is not percent-encoded.
  }
  const stripped = decoded
    .normalize("NFC")
    .replace(/-[a-f0-9]{8,12}$/i, (suffix) => (/\d/.test(suffix.slice(1)) ? "" : suffix));
  const tokens = stripped.split("-").filter(Boolean);
  if (tokens.length < 2) {
    return null;
  }
  const titled = tokens.map(titleCaseHandleToken);
  const firstName = titled[0];
  const lastName = titled[titled.length - 1];
  if (!firstName) {
    return null;
  }
  return {
    firstName,
    ...(lastName && lastName !== firstName ? { lastName } : {}),
    ...(titled.length > 2 ? { middleName: titled.slice(1, -1).join(" ") } : {}),
  };
}

export function splitName(fullName: string): {
  firstName: string;
  middleName?: string;
  lastName?: string;
} {
  const parts = fullName.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: "" };
  }
  if (parts.length === 1) {
    return { firstName: parts[0] ?? "" };
  }
  const firstName = parts[0] ?? "";
  const lastName = parts.length > 1 ? (parts[parts.length - 1] ?? "") : "";
  return {
    firstName,
    lastName,
    ...(parts.length > 2 ? { middleName: parts.slice(1, -1).join(" ") } : {}),
  };
}

export function extractSduiIdentity(doc?: Document, handle?: string): SduiIdentity | null {
  const topcard = getTopcard(doc);
  if (!topcard) {
    return null;
  }

  const nameCandidates = [
    text(topcard.querySelector("h1")),
    text(topcard.querySelector("h2")),
    text(topcard.querySelector('[data-anonymize="person-name"]')),
  ].filter(Boolean);
  const fullName =
    nameCandidates.find((candidate) => !looksLikeLinkedInVanityHandle(candidate, handle)) ?? "";
  if (!fullName) {
    return null;
  }

  const paragraphs = [...topcard.querySelectorAll("p")]
    .map((p) => text(p))
    .filter((t) => t && t !== "·" && !CONNECTION_BADGE.test(t));

  const headline = paragraphs.find(
    (t) =>
      t !== fullName &&
      !/,/.test(t) &&
      !SOCIAL_PROOF_LINE.test(t) &&
      !MUTUAL_CONNECTIONS.test(t) &&
      t.length > 3,
  );

  const profilePhotoUrl =
    topcard.querySelector<HTMLImageElement>('img[src*="profile-displayphoto"]')?.src ??
    [...topcard.querySelectorAll<HTMLImageElement>("img")]
      .map((i) => i.src)
      .find((s) => /profile|displayphoto|shrink/i.test(s));

  const { firstName, middleName, lastName } = splitName(fullName);
  if (!firstName || looksLikeLinkedInVanityHandle(firstName, handle)) {
    return null;
  }

  return {
    firstName,
    fullName,
    ...(middleName ? { middleName } : {}),
    ...(lastName ? { lastName } : {}),
    ...(headline ? { headline } : {}),
    ...(profilePhotoUrl ? { profilePhotoUrl } : {}),
  };
}

// ─── Bio ─────────────────────────────────────────────────────────────────────

export function extractSduiBio(doc?: Document): string | undefined {
  try {
    const d = getDoc(doc);
    const aboutCard =
      d.querySelector('[componentkey*="AboutTopLevelSection"]') ??
      d.querySelector('[componentkey*="About"]') ??
      d.querySelector("section:has(#about)") ??
      d.querySelector("#about")?.closest("section");
    if (!aboutCard) {
      return undefined;
    }

    const expandable = text(aboutCard.querySelector('[data-testid="expandable-text-box"]'));
    if (expandable) {
      return expandable;
    }

    const candidates = [...aboutCard.querySelectorAll("p, span")]
      .filter((el) => el.children.length === 0)
      .map((el) => text(el))
      .filter((t) => t.length > 20 && !/^[\w\s]+•[\w\s]+•/.test(t))
      .sort((a, b) => b.length - a.length);

    return candidates[0] || undefined;
  } catch {
    return undefined;
  }
}

// ─── Work history ────────────────────────────────────────────────────────────

function getExperienceSection(doc?: Document): Element | null {
  const d = getDoc(doc);
  return (
    d.querySelector('[componentkey*="ExperienceTopLevelSection"]') ??
    d.querySelector("section:has(#experience)") ??
    d.querySelector("#experience")?.closest("section") ??
    d.querySelector('[componentkey*="Experience"]')
  );
}

function getEducationSection(doc?: Document): Element | null {
  const d = getDoc(doc);
  return (
    d.querySelector('[componentkey*="EducationTopLevelSection"]') ??
    d.querySelector("section:has(#education)") ??
    d.querySelector("#education")?.closest("section") ??
    d.querySelector('[componentkey*="Education"]')
  );
}

export function extractSduiWorkHistory(doc?: Document): WorkEntry[] {
  const expSection = getExperienceSection(doc);
  if (!expSection) {
    return [];
  }

  const entries: WorkEntry[] = [];
  const items = expSection.querySelectorAll(
    '[componentkey^="entity-collection-item-"], li.artdeco-list__item, div[data-view-name="profile-component-entity"]',
  );

  for (const item of items) {
    const texts = leafTexts(item);
    if (!texts.length) {
      continue;
    }

    const companyHref =
      item.querySelector<HTMLAnchorElement>('a[href*="/company/"]')?.href ??
      item.querySelector<HTMLAnchorElement>('a[href*="/school/"]')?.href;

    const logoEl =
      item.querySelector<HTMLImageElement>("img[alt]") ??
      item.querySelector<SVGElement>("svg[aria-label]");

    const logoName = stripLogo(
      logoEl?.getAttribute("alt") ?? logoEl?.getAttribute("aria-label") ?? "",
    );

    const title = texts[0] ?? "";
    const companyLine = texts[1] ?? "";
    const { companyName, employmentType } = splitCompanyLine(companyLine);
    const dateText = texts.find(isDateText) ?? "";
    const loc = texts.find(
      (t) => t !== title && t !== companyLine && t !== dateText && !EMPLOYMENT_TYPES.has(t),
    );
    const description = texts.find((t) => t.length > 80 && t !== dateText);

    const logoImg = logoEl instanceof HTMLImageElement ? logoEl : null;

    entries.push({
      companyName: companyName || logoName || title,
      title,
      ...(orgId(companyHref) ? { companyLinkedinId: orgId(companyHref) } : {}),
      ...(logoImg?.src ? { companyLogoUrl: logoImg.src } : {}),
      ...parseDateRange(dateText),
      ...(employmentType ? { employmentType } : {}),
      ...(loc ? { location: loc } : {}),
      ...(description ? { description } : {}),
    });
  }

  return entries;
}

// ─── Education ───────────────────────────────────────────────────────────────

export function extractSduiEducation(doc?: Document): EducationEntry[] {
  const eduSection = getEducationSection(doc);
  if (!eduSection) {
    return [];
  }

  const entries: EducationEntry[] = [];
  const seen = new Set<string>();

  for (const anchor of eduSection.querySelectorAll<HTMLAnchorElement>('a[href*="/school/"]')) {
    const line = text(anchor);
    if (!line || /show all \d+ educations/i.test(line)) {
      continue;
    }

    const schoolLinkedinId = orgId(anchor.href, "school");
    const key = `${schoolLinkedinId ?? ""}:${line}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    const row = anchor.closest("div");
    const logoEl =
      row?.querySelector<HTMLImageElement>("img[alt]") ??
      row?.querySelector<SVGElement>("svg[aria-label]");

    const schoolFromLogo = stripLogo(
      logoEl?.getAttribute("alt") ?? logoEl?.getAttribute("aria-label") ?? "",
    );

    const dateMatch = line.match(
      /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+)?\d{4}\s*[–—-]\s*(?:Present|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+)?\d{0,4}/i,
    );
    const dateText = dateMatch?.[0] ?? "";
    const beforeDates = dateText ? line.slice(0, line.indexOf(dateText)).trim() : line;
    const degree =
      schoolFromLogo && beforeDates.startsWith(schoolFromLogo)
        ? beforeDates.slice(schoolFromLogo.length).trim().replace(/^,\s*/, "") || undefined
        : undefined;

    const logoImg = logoEl instanceof HTMLImageElement ? logoEl : null;

    entries.push({
      schoolName: schoolFromLogo || (beforeDates.split(/\d{4}/)[0]?.trim() ?? "") || line,
      ...(schoolLinkedinId ? { schoolLinkedinId } : {}),
      ...(logoImg?.src ? { schoolLogoUrl: logoImg.src } : {}),
      ...(degree ? { degree } : {}),
      ...parseDateRange(dateText),
    });
  }

  return entries;
}

// ─── Lazy-load helper ────────────────────────────────────────────────────────

/**
 * Scrolls the page and polls until SDUI experience section mounts, or timeout.
 * LinkedIn lazy-loads Experience/Education on scroll.
 * Do not use requestAnimationFrame: inactive enrich tabs pause rAF forever.
 */
export async function ensureProfileSectionsLoaded(
  doc?: Document,
  timeoutMs = 8000,
): Promise<boolean> {
  const d = getDoc(doc);
  const selector =
    '[componentkey*="ExperienceTopLevelSection"], section:has(#experience), #experience';

  return pollUntil(
    () => Boolean(d.querySelector(selector)),
    timeoutMs,
    () => {
      window.scrollTo(0, document.body.scrollHeight * 0.4);
    },
  );
}
