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

// Month name → zero-padded number. Keys are lowercase for case-insensitive lookup.
// Covers: English, Czech, German, French, Spanish, Portuguese, Dutch, Italian, Polish.
const MONTH_ABBR: Record<string, string> = {
  // English
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
  // Czech
  leden: "01",
  únor: "02",
  březen: "03",
  duben: "04",
  květen: "05",
  červen: "06",
  červenec: "07",
  srpen: "08",
  září: "09",
  říjen: "10",
  listopad: "11",
  prosinec: "12",
  // German
  januar: "01",
  februar: "02",
  märz: "03",
  mrz: "03",
  mai: "05",
  juni: "06",
  juli: "07",
  august: "08",
  september: "09",
  oktober: "10",
  november: "11",
  dezember: "12",
  dez: "12",
  // French
  janv: "01",
  févr: "02",
  mars: "03",
  avr: "04",
  juin: "06",
  juil: "07",
  août: "08",
  sept: "09",
  déc: "12",
  // Spanish
  ene: "01",
  abr: "04",
  ago: "08",
  dic: "12",
  // Portuguese
  fev: "02",
  set: "09",
  out: "10",
  // Dutch
  mrt: "03",
  mei: "05",
  okt: "10",
  // Italian
  gen: "01",
  mag: "05",
  giu: "06",
  lug: "07",
  ott: "10",
  // Polish
  sty: "01",
  lut: "02",
  kwi: "04",
  cze: "06",
  lip: "07",
  sie: "08",
  wrz: "09",
  paź: "10",
  lis: "11",
  gru: "12",
};

function parseMonthYear(text: string): string | undefined {
  // Match a word (month name in any supported language) followed by a 4-digit year.
  // [A-Za-zÀ-ž] covers English and most European scripts (Czech, German, French…).
  const wordYearMatch = text.match(/([A-Za-zÀ-ž]+)\.?\s+((19|20)\d{2})/);
  if (wordYearMatch) {
    const monthKey = wordYearMatch[1].toLowerCase().replace(/\.$/, "");
    const year = wordYearMatch[2];
    const month = MONTH_ABBR[monthKey];
    // Return YYYY-MM when month is known, YYYY-only otherwise (still useful).
    return month ? `${year}-${month}` : year;
  }
  // Year-only date (e.g. "2022" or embedded in "2022 · 3 mos").
  const yearOnly = text.match(/\b((19|20)\d{2})\b/);
  return yearOnly ? yearOnly[1] : undefined;
}

function isDateText(text: string): boolean {
  // Language-agnostic: a date span always contains a 4-digit year (1970–2039)
  // combined with either a range separator (–/—) or a bullet (·), or is a bare year.
  if (!/\b(19[7-9]\d|20[0-3]\d)\b/.test(text)) return false;
  return /[–—·]/.test(text) || /^\s*(19|20)\d{2}\s*$/.test(text);
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

// "Present" / "current" in the languages LinkedIn is available in.
const PRESENT_RE =
  /\b(present|current|today|heute|vandaag|idag|hoy|hoje|adesso|attualmente|ahora|actuellement|teraz|tällä hetkellä|şimdi|současnost|dnes|nyní|nüüd|nyt|nå|nú|сейчас|現在|现在|현재|الآن)\b/i;

export function parseDateRange(text: string): { startDate?: string; endDate?: string } {
  // Strip the duration suffix "· X years Y months" so it doesn't confuse the parser.
  const mainPart = text.split("·")[0].trim();
  // Split on en-dash (–), em-dash (—), or a plain hyphen.
  const parts = mainPart.split(/\s*[–—\u2013-]\s*/);
  const startRaw = parts[0]?.trim();
  const endRaw = parts[1]?.trim();
  const startDate = startRaw ? parseMonthYear(startRaw) : undefined;
  const isPresent = !endRaw || PRESENT_RE.test(endRaw);
  const endDate = isPresent ? undefined : parseMonthYear(endRaw ?? "");
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
 * Strips localised "logo" prefix/suffix from a LinkedIn img alt attribute to
 * recover the plain company name.
 *
 * LinkedIn localises the alt text per UI language:
 *   English : "Acme Corp logo"              → strip trailing " logo"
 *   Czech   : "Logo společnosti Acme Corp" → strip leading "Logo [word] "
 *   German  : "Logo von Acme Corp"          → strip leading "Logo [word] "
 *   French  : "Logo de Acme Corp"           → strip leading "Logo [word] "
 */
function extractCompanyNameFromImgAlt(alt: string): string {
  return (
    alt
      // Strip trailing " logo" or "-Logo" (English, some German)
      .replace(/\s*-?\s*logo\s*$/i, "")
      // Strip leading "Logo [preposition/article] " (Czech, German, French, etc.)
      // Uses a lazy match so only the first word after "Logo" is consumed.
      .replace(/^logo\s+\S+?\s+/i, "")
      // Final catch-all: strip a bare leading "Logo " with no following word
      .replace(/^logo\s+/i, "")
      .trim()
  );
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
      ? companyUrl
          .match(/linkedin\.com\/(?:company|school|organization|showcase)\/([^/?#]+)/i)?.[1]
          ?.toLowerCase()
      : undefined;
    const logoImg = anchor.querySelector<HTMLImageElement>("img[alt]");
    const companyLogoUrl = logoImg?.src || undefined;

    const parentLi = anchor.closest("li");

    // Sibling text anchor: same data-field but no image model — carries all textual data
    // (company name, total duration, or for single-role: title / company / date / location).
    const siblingTextAnchor = parentLi
      ? Array.from(
          parentLi.querySelectorAll<HTMLAnchorElement>('a[data-field="experience_company_logo"]'),
        ).find((a) => a !== anchor && !a.querySelector(".ivm-image-view-model"))
      : null;
    const siblingSpans = siblingTextAnchor
      ? (Array.from(siblingTextAnchor.querySelectorAll<HTMLElement>('span[aria-hidden="true"]'))
          .map((s) => s.textContent?.trim())
          .filter(Boolean) as string[])
      : [];

    // Grouped entries: sibling shows only company name + total duration (no date range).
    // Single-role entries: sibling shows title + company + date + optional location.
    const siblingHasDateRange = siblingSpans.some((s) => isDateText(s));

    // Company name — derived from sibling text anchor spans (language-agnostic) rather
    // than the img alt which LinkedIn localises ("Logo společnosti X" in Czech, etc.).
    let companyNameFromLogo: string | undefined;
    if (!siblingHasDateRange && siblingSpans.length > 0) {
      // Grouped: first sibling span is always the company name.
      companyNameFromLogo = siblingSpans[0];
    } else if (siblingHasDateRange) {
      // Single-role: spans are [title, company?, date, location?].
      // Company lives between the title (index 0) and the first date span.
      const dateIdx = siblingSpans.findIndex((s) => isDateText(s));
      if (dateIdx > 1) {
        companyNameFromLogo = siblingSpans[1];
      }
    }
    // Last resort: strip the localised logo prefix/suffix from the img alt.
    if (!companyNameFromLogo && logoImg?.alt) {
      companyNameFromLogo = extractCompanyNameFromImgAlt(logoImg.alt);
    }

    // Inner role anchors: same href, must contain a date span (filters out summary rows).
    // The sibling text anchor is explicitly excluded — for grouped entries it shows only
    // company name + total duration; for single-role it is handled in the else branch.
    const innerRoleAnchors: HTMLAnchorElement[] = parentLi
      ? Array.from(parentLi.querySelectorAll<HTMLAnchorElement>("a")).filter((a) => {
          if (a === anchor || a === siblingTextAnchor) return false;
          if (companyUrl && a.href !== companyUrl) return false;
          return Array.from(a.querySelectorAll<HTMLElement>('span[aria-hidden="true"]')).some(
            (s) => s.textContent?.trim() && isDateText(s.textContent.trim()),
          );
        })
      : [];

    if (innerRoleAnchors.length > 0) {
      // Grouped: sibling text anchor holds company name + total duration.
      // Employment type (if any) is in those same outer spans.
      const groupEmploymentType = extractEmploymentType(siblingSpans);

      processedAnchors.add(anchor);
      if (siblingTextAnchor) processedAnchors.add(siblingTextAnchor);
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
          (t) => !isDateText(t) && !isEmploymentType(t) && t !== title && t !== companyNameFromLogo,
        );
        const location = locationRaw
          ?.replace(
            /\s*·\s*(On-site|Remote|Hybrid|Na místě|Hybridní|Vzdálené|Präsenz|Fernarbeit|Hybrides Arbeiten|Sur site|À distance|En présentiel|Híbrido|Remoto|Presencial|Sul posto|A distanza|In loco)\s*$/i,
            "",
          )
          .trim();
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
      // Single role — extract from the sibling text anchor's spans:
      // [title (.t-bold), company?, date, location?, ...]
      processedAnchors.add(anchor);
      if (siblingTextAnchor) processedAnchors.add(siblingTextAnchor);
      const textsToUse = siblingSpans;
      const title =
        textsToUse.find(
          (t) => !isDateText(t) && !isEmploymentType(t) && t !== companyNameFromLogo,
        ) ?? "";
      const dateText = textsToUse.find((t) => isDateText(t)) ?? "";
      const employmentType = extractEmploymentType(textsToUse);
      const locationRaw = textsToUse.find(
        (t) => !isDateText(t) && !isEmploymentType(t) && t !== title && t !== companyNameFromLogo,
      );
      const location = locationRaw
        ?.replace(
          /\s*·\s*(On-site|Remote|Hybrid|Na místě|Hybridní|Vzdálené|Präsenz|Fernarbeit|Hybrides Arbeiten|Sur site|À distance|En présentiel|Híbrido|Remoto|Presencial|Sul posto|A distanza|In loco)\s*$/i,
          "",
        )
        .trim();
      const entityDiv = anchor.closest('[data-view-name="profile-component-entity"]');
      const description = entityDiv ? extractDirectSubComponentDescription(entityDiv) : undefined;
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
