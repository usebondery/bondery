/**
 * LinkedIn Work Experience DOM Scraper
 *
 * Extracts work experience entries from a LinkedIn profile page using DOM queries.
 * Shared between the content script and the LinkedIn button component.
 */

export interface WorkEntry {
  title: string;
  companyName: string;
  /** LinkedIn company handle or numeric ID — used to build the canonical URL server-side */
  companyLinkedinId?: string;
  companyLogoUrl?: string;
  companyUrn?: string; // Internal: Voyager URN used for logo resolution, not sent to API
  startDate?: string; // "YYYY-MM" or "YYYY"
  endDate?: string; // "YYYY-MM" or "YYYY" — undefined means present
  employmentType?: string; // e.g. "Full-time", "Part-time", "Internship"
  location?: string; // e.g. "Praha, Česko"
  description?: string; // Free-text description/notes for the role
}

const MONTH_ABBR: Record<string, string> = {
  Jan: "01",
  Feb: "02",
  Mar: "03",
  Apr: "04",
  May: "05",
  Jun: "06",
  Jul: "07",
  Aug: "08",
  Sep: "09",
  Oct: "10",
  Nov: "11",
  Dec: "12",
};

function parseMonthYear(text: string): string | undefined {
  const match = text.match(/([A-Za-z]{3})\s+(\d{4})/);
  if (!match) {
    const yearOnly = text.match(/^(\d{4})$/);
    return yearOnly ? yearOnly[1] : undefined;
  }
  const month = MONTH_ABBR[match[1]];
  return month ? `${match[2]}-${month}` : match[2];
}

function isDateText(text: string): boolean {
  return (
    /\d{4}/.test(text) &&
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Present)/i.test(text)
  );
}

const EMPLOYMENT_TYPES = [
  "Full-time",
  "Part-time",
  "Self-employed",
  "Freelance",
  "Contract",
  "Internship",
  "Apprenticeship",
  "Seasonal",
];

/** Returns true if any part of a compound span text (e.g. "KB · Internship") is an employment type */
function isEmploymentType(text: string): boolean {
  return text.split(" · ").some((p) => EMPLOYMENT_TYPES.includes(p));
}

/** Finds and returns the employment type string from a list of span texts */
function extractEmploymentType(texts: string[]): string | undefined {
  for (const t of texts) {
    const found = t.split(" · ").find((p) => EMPLOYMENT_TYPES.includes(p));
    if (found) return found;
  }
  return undefined;
}

export function parseDateRange(text: string): { startDate?: string; endDate?: string } {
  const parts = text.split(/\s*[-\u2013]\s*/);
  const startRaw = parts[0]?.trim();
  const endRaw = parts[1]?.trim();
  const startDate = startRaw ? parseMonthYear(startRaw) : undefined;
  const endDate = endRaw && !/present/i.test(endRaw) ? parseMonthYear(endRaw) : undefined;
  return {
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
  };
}

/**
 * Converts an element's content to a string, replacing <br> with \n
 * for proper newline preservation.
 */
function elementToText(el: HTMLElement): string {
  const clone = el.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
  return clone.textContent ?? "";
}

/**
 * Extracts description text from a `pvs-entity__sub-components` container or any entity container.
 * Looks for `[dir="ltr"][tabindex="-1"]` description divs that are not inside anchor elements
 * (to avoid capturing skills badge text).
 */
function extractDirectSubComponentDescription(container: Element): string | undefined {
  const descDivs = Array.from(
    container.querySelectorAll<HTMLElement>('[dir="ltr"][tabindex="-1"]'),
  );
  const texts = descDivs
    .filter((div) => div.closest("a") === null)
    .map((div) => {
      const span = div.querySelector<HTMLElement>('span[aria-hidden="true"]');
      return span ? elementToText(span).trim() : undefined;
    })
    .filter(Boolean) as string[];
  return texts.length > 0 ? texts.join("\n\n") : undefined;
}

/**
 * Scrapes the LinkedIn Experience section of the current page and returns
 * a structured list of work entries.
 *
 * Strategy:
 * - Locates the #experience heading and its parent <section>
 * - Finds all `a[data-field="experience_company_logo"]` anchors that have a logo img (company-level)
 * - Grouped entries (one company, multiple roles) are detected via sibling anchors with the
 *   same href that contain a date span
 * - Employment type lives in the outer "summary" anchor for grouped entries
 */
export function extractWorkExperience(root?: Element | Document): WorkEntry[] {
  let section: Element | null;

  if (root) {
    // When a pre-parsed DOM root is provided (e.g. from a fetched details page),
    // use it directly — there is no #experience heading on the details page.
    section = root instanceof Document ? root.documentElement : root;
  } else {
    const heading = document.getElementById("experience");
    if (!heading) return [];
    section = heading.closest("section");
  }

  if (!section) return [];

  const entries: WorkEntry[] = [];

  // Select image-area anchors — these contain the company logo (or a ghost placeholder).
  // Role-level text anchors also carry data-field="experience_company_logo" but have no image model.
  const companyAnchors = Array.from(
    section.querySelectorAll<HTMLAnchorElement>('a[data-field="experience_company_logo"]'),
  ).filter((a) => a.querySelector(".ivm-image-view-model") !== null);

  const processedAnchors = new Set<Element>();

  for (const anchor of companyAnchors) {
    if (processedAnchors.has(anchor)) continue;

    const companyUrl = anchor.href || undefined;
    // Extract the LinkedIn identifier from the URL (e.g. "zs-associates" from
    // "https://www.linkedin.com/company/zs-associates/")
    const companyLinkedinIdFromUrl = companyUrl
      ? companyUrl.match(/linkedin\.com\/(?:company|school|organization|showcase)\/([^/?#]+)/i)?.[1]?.toLowerCase()
      : undefined;
    const logoImg = anchor.querySelector<HTMLImageElement>("img[alt]");
    const companyNameFromLogo =
      logoImg?.alt?.replace(/ logo\s*$/i, "").trim() ||
      anchor.querySelector<HTMLElement>(".visually-hidden")?.textContent?.replace(/ logo\s*$/i, "").trim() ||
      undefined;
    const companyLogoUrl = logoImg?.src || undefined;

    const texts = Array.from(anchor.querySelectorAll<HTMLElement>('span[aria-hidden="true"]'))
      .map((s) => s.textContent?.trim())
      .filter(Boolean) as string[];

    const parentLi = anchor.closest("li");

    // Inner role anchors: same href, must contain a date span (filters out summary rows)
    const innerRoleAnchors: HTMLAnchorElement[] = parentLi
      ? Array.from(parentLi.querySelectorAll<HTMLAnchorElement>("a")).filter((a) => {
          if (a === anchor || a.href !== companyUrl) return false;
          return Array.from(a.querySelectorAll<HTMLElement>('span[aria-hidden="true"]')).some(
            (s) => s.textContent?.trim() && isDateText(s.textContent.trim()),
          );
        })
      : [];

    if (innerRoleAnchors.length > 0) {
      // Grouped: employment type lives in the outer text anchor (the summary row)
      const outerTextAnchor = parentLi
        ? Array.from(
            parentLi.querySelectorAll<HTMLAnchorElement>('a[data-field="experience_company_logo"]'),
          ).find((a) => a !== anchor)
        : null;
      const outerTexts = Array.from(
        outerTextAnchor?.querySelectorAll<HTMLElement>('span[aria-hidden="true"]') ?? [],
      )
        .map((s) => s.textContent?.trim())
        .filter(Boolean) as string[];
      const groupEmploymentType = extractEmploymentType(outerTexts);

      processedAnchors.add(anchor);
      innerRoleAnchors.forEach((a) => processedAnchors.add(a));

      for (const roleAnchor of innerRoleAnchors) {
        const roleTexts = Array.from(
          roleAnchor.querySelectorAll<HTMLElement>('span[aria-hidden="true"]'),
        )
          .map((s) => s.textContent?.trim())
          .filter(Boolean) as string[];
        const title =
          roleTexts.find(
            (t) => !isDateText(t) && !isEmploymentType(t) && t !== companyNameFromLogo,
          ) ?? "";
        const dateText = roleTexts.find((t) => isDateText(t)) ?? "";
        const employmentType = extractEmploymentType(roleTexts) ?? groupEmploymentType;
        const locationRaw = roleTexts.find(
          (t) =>
            !isDateText(t) && !isEmploymentType(t) && t !== title && t !== companyNameFromLogo,
        );
        const location = locationRaw?.replace(/\s*·\s*(On-site|Remote|Hybrid)$/i, "").trim();
        const roleEntity = roleAnchor.closest('[data-view-name="profile-component-entity"]');
        const description = roleEntity
          ? extractDirectSubComponentDescription(roleEntity)
          : undefined;
        entries.push({
          title,
          companyName: companyNameFromLogo ?? "",
          ...(companyLinkedinIdFromUrl ? { companyLinkedinId: companyLinkedinIdFromUrl } : {}),
          ...(companyLogoUrl ? { companyLogoUrl } : {}),
          ...parseDateRange(dateText),
          ...(employmentType ? { employmentType } : {}),
          ...(location ? { location } : {}),
          ...(description ? { description } : {}),
        });
      }
    } else {
      // Simple: single role — title is first non-date, non-type, non-company span
      const title =
        texts.find((t) => !isDateText(t) && !isEmploymentType(t) && t !== companyNameFromLogo) ??
        "";
      const dateText = texts.find((t) => isDateText(t)) ?? "";
      const employmentType = extractEmploymentType(texts);
      const locationRaw = texts.find(
        (t) =>
          !isDateText(t) && !isEmploymentType(t) && t !== title && t !== companyNameFromLogo,
      );
      const location = locationRaw?.replace(/\s*·\s*(On-site|Remote|Hybrid)$/i, "").trim();
      const entityDiv = anchor.closest('[data-view-name="profile-component-entity"]');
      const description = entityDiv
        ? extractDirectSubComponentDescription(entityDiv)
        : undefined;
      entries.push({
        title,
        companyName: companyNameFromLogo ?? title,
        ...(companyLinkedinIdFromUrl ? { companyLinkedinId: companyLinkedinIdFromUrl } : {}),
        ...(companyLogoUrl ? { companyLogoUrl } : {}),
        ...parseDateRange(dateText),
        ...(employmentType ? { employmentType } : {}),
        ...(location ? { location } : {}),
        ...(description ? { description } : {}),
      });
    }
  }

  return entries;
}
