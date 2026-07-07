/**
 * LinkedIn SDUI (Server-Driven UI) profile DOM scraper.
 *
 * Anchors on stable `componentkey` attributes instead of legacy selectors
 * (data-member-id, #experience, data-field="experience_company_logo").
 */

import type { EducationEntry } from "./education";
import { parseDateRange } from "./workExperience";
import type { WorkEntry } from "./workExperience";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SduiIdentity {
  fullName: string;
  firstName: string;
  middleName?: string;
  lastName?: string;
  headline?: string;
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
  return /\b(19[7-9]\d|20[0-3]\d)\b/.test(t) && (/[–—·-]/.test(t) || /^\s*(19|20)\d{2}\s*$/.test(t));
}

function orgId(href: string | undefined, kind: "company" | "school" = "company"): string | undefined {
  if (!href) return undefined;
  const re =
    kind === "school"
      ? /linkedin\.com\/school\/([^/?#]+)/i
      : /linkedin\.com\/(?:company|school|organization|showcase)\/([^/?#]+)/i;
  return href.match(re)?.[1]?.toLowerCase();
}

function splitCompanyLine(line: string): { companyName: string; employmentType?: string } {
  const parts = line.split(" · ");
  const last = parts[parts.length - 1];
  if (parts.length >= 2 && EMPLOYMENT_TYPES.has(last)) {
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
  return getDoc(doc).querySelector('[componentkey*="Topcard"]');
}

/**
 * Parses the fsd_profile URN from the topcard componentkey.
 * e.g. "…refACoAAABbCU8BZ1u7ldnivR0qeqOY0lnnhiyUDswTopcard" → urn:li:fsd_profile:ACoAAABbCU8BZ1u7ldnivR0qeqOY0lnnhiyUDsw
 */
export function extractProfileUrnFromComponentKey(doc?: Document): string | null {
  const topcard = getTopcard(doc);
  const key = topcard?.getAttribute("componentkey");
  if (!key) return null;

  // Match ref(ACo…) followed by a section suffix (Topcard, About, etc.)
  const match = key.match(/ref(ACo[A-Za-z0-9_-]+?)(?:Topcard|About|Experience|Education|Featured|Services|$)/);
  if (!match?.[1]) return null;

  return `urn:li:fsd_profile:${match[1]}`;
}

// ─── Identity ────────────────────────────────────────────────────────────────

export function splitName(fullName: string): {
  firstName: string;
  middleName?: string;
  lastName?: string;
} {
  const parts = fullName.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "" };
  if (parts.length === 1) return { firstName: parts[0] };
  return {
    firstName: parts[0],
    lastName: parts[parts.length - 1],
    ...(parts.length > 2 ? { middleName: parts.slice(1, -1).join(" ") } : {}),
  };
}

export function extractSduiIdentity(doc?: Document): SduiIdentity | null {
  const topcard = getTopcard(doc);
  if (!topcard) return null;

  const fullName = text(topcard.querySelector("h2"));
  if (!fullName) return null;

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

  return {
    fullName,
    firstName,
    ...(middleName ? { middleName } : {}),
    ...(lastName ? { lastName } : {}),
    ...(headline ? { headline } : {}),
    ...(profilePhotoUrl ? { profilePhotoUrl } : {}),
  };
}

// ─── Bio ─────────────────────────────────────────────────────────────────────

export function extractSduiBio(doc?: Document): string | undefined {
  const aboutCard = getDoc(doc).querySelector('[componentkey*="About"]');
  if (!aboutCard) return undefined;

  const expandable = text(aboutCard.querySelector('[data-testid="expandable-text-box"]'));
  if (expandable && expandable.length > 20) return expandable;

  const candidates = [...aboutCard.querySelectorAll("p, span")]
    .filter((el) => el.children.length === 0)
    .map((el) => text(el))
    .filter((t) => t.length > 80 && !/^[\w\s]+•[\w\s]+•/.test(t))
    .sort((a, b) => b.length - a.length);

  return candidates[0] || undefined;
}

// ─── Work history ────────────────────────────────────────────────────────────

export function extractSduiWorkHistory(doc?: Document): WorkEntry[] {
  const expSection = getDoc(doc).querySelector('[componentkey*="ExperienceTopLevelSection"]');
  if (!expSection) return [];

  const entries: WorkEntry[] = [];

  for (const item of expSection.querySelectorAll('[componentkey^="entity-collection-item-"]')) {
    const texts = leafTexts(item);
    if (!texts.length) continue;

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
      title,
      companyName: companyName || logoName || title,
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
  const eduSection = getDoc(doc).querySelector('[componentkey*="EducationTopLevelSection"]');
  if (!eduSection) return [];

  const entries: EducationEntry[] = [];
  const seen = new Set<string>();

  for (const anchor of eduSection.querySelectorAll<HTMLAnchorElement>('a[href*="/school/"]')) {
    const line = text(anchor);
    if (!line || /show all \d+ educations/i.test(line)) continue;

    const schoolLinkedinId = orgId(anchor.href, "school");
    const key = `${schoolLinkedinId ?? ""}:${line}`;
    if (seen.has(key)) continue;
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
      schoolName: schoolFromLogo || beforeDates.split(/\d{4}/)[0].trim() || line,
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
 */
export async function ensureProfileSectionsLoaded(
  doc?: Document,
  timeoutMs = 8000,
): Promise<boolean> {
  const d = getDoc(doc);
  const selector = '[componentkey*="ExperienceTopLevelSection"]';

  if (d.querySelector(selector)) return true;

  const start = Date.now();

  return new Promise((resolve) => {
    const tick = () => {
      if (d.querySelector(selector)) {
        resolve(true);
        return;
      }
      if (Date.now() - start > timeoutMs) {
        resolve(false);
        return;
      }
      window.scrollTo(0, document.body.scrollHeight * 0.4);
      requestAnimationFrame(tick);
    };
    tick();
  });
}
