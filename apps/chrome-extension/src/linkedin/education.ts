/**
 * LinkedIn Education DOM Scraper
 *
 * Extracts education entries from a LinkedIn profile page using DOM queries.
 * Shared between the content script and the LinkedIn button component.
 */

import { parseDateRange } from "./workExperience";

export interface EducationEntry {
  schoolName: string;
  /** LinkedIn school handle or numeric ID — used to build the canonical URL server-side */
  schoolLinkedinId?: string;
  schoolLogoUrl?: string;
  degree?: string;
  description?: string;
  startDate?: string; // "YYYY-MM" or "YYYY"
  endDate?: string; // "YYYY-MM" or "YYYY" — undefined means ongoing
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
 * Collects description text from a container element.
 * Finds all `[dir="ltr"][tabindex="-1"]` text blocks that are NOT inside
 * anchor elements (to exclude skills badges and navigation links).
 */
function extractDescriptionText(container: Element): string | undefined {
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
 * Scrapes the LinkedIn Education section of the current page and returns
 * a structured list of education entries.
 *
 * Strategy:
 * - Locates the #education heading and its parent <section>
 * - Iterates over every `[data-view-name="profile-component-entity"]` inside the section
 * - Logo anchor (has img[alt]) → school name, URL, logo URL
 * - Text anchor (has `.pvs-entity__caption-wrapper`) → degree + date range
 * - Sub-components → description/activities text
 */
export function extractEducation(root?: Element | Document): EducationEntry[] {
  let section: Element | null;

  if (root) {
    // When a pre-parsed DOM root is provided (e.g. from a fetched details page),
    // use it directly — there is no #education heading on the details page.
    section = root instanceof Document ? root.documentElement : root;
  } else {
    const heading = document.getElementById("education");
    if (!heading) return [];
    section = heading.closest("section");
  }

  if (!section) return [];

  const entries: EducationEntry[] = [];

  const entityDivs = Array.from(
    section.querySelectorAll<HTMLElement>('[data-view-name="profile-component-entity"]'),
  );

  for (const entity of entityDivs) {
    // Logo anchor: the anchor wrapping the school image or ghost placeholder
    const logoAnchor = Array.from(entity.querySelectorAll<HTMLAnchorElement>("a")).find(
      (a) => a.querySelector(".ivm-image-view-model") !== null,
    );
    const logoImg = logoAnchor?.querySelector<HTMLImageElement>("img[alt]");
    const schoolUrl = logoAnchor?.href || undefined;
    // Extract the LinkedIn identifier from the URL
    const schoolLinkedinId = schoolUrl
      ? schoolUrl.match(/linkedin\.com\/(?:company|school|organization|showcase)\/([^/?#]+)/i)?.[1]?.toLowerCase()
      : undefined;
    const schoolLogoUrl = logoImg?.src || undefined;

    // School name: prefer img alt, fall back to ghost placeholder text, then text anchor spans
    let schoolName =
      logoImg?.alt?.replace(/ logo\s*$/i, "").trim() ||
      logoAnchor?.querySelector<HTMLElement>(".visually-hidden")?.textContent?.replace(/ logo\s*$/i, "").trim();

    if (!schoolName) {
      const fallbackAnchor = entity.querySelector<HTMLAnchorElement>("a:has(.pvs-entity__caption-wrapper)");
      const spans = Array.from(fallbackAnchor?.querySelectorAll<HTMLElement>('span[aria-hidden="true"]') ?? [])
        .filter((s) => !s.closest(".pvs-entity__caption-wrapper"));
      schoolName = spans[0]?.textContent?.trim();
    }

    // Skip entries without a recognisable school name
    if (!schoolName) continue;

    // Text anchor: the anchor that contains the caption-wrapper date span.
    // This is always the main school-name / degree / date link.
    const textAnchor = entity.querySelector<HTMLAnchorElement>("a:has(.pvs-entity__caption-wrapper)");
    const captionText = textAnchor
      ?.querySelector<HTMLElement>(".pvs-entity__caption-wrapper")
      ?.textContent?.trim();
    const dateRange = captionText ? parseDateRange(captionText) : {};

    // Degree: the first span[aria-hidden="true"] in the text anchor that is NOT
    // the school name itself and NOT inside the caption-wrapper span.
    let degree: string | undefined;
    if (textAnchor) {
      const spans = Array.from(
        textAnchor.querySelectorAll<HTMLElement>('span[aria-hidden="true"]'),
      ).filter((s) => !s.closest(".pvs-entity__caption-wrapper"));

      const spanTexts = spans.map((s) => s.textContent?.trim()).filter(Boolean) as string[];
      // spans[0] is school name (matches schoolName), spans[1] is degree
      degree = spanTexts.find((t) => t !== schoolName) || undefined;
    }

    // Description: collect all text blocks from sub-components
    const subComponents = entity.querySelector(".pvs-entity__sub-components");
    const description = subComponents ? extractDescriptionText(subComponents) : undefined;

    entries.push({
      schoolName,
      ...(schoolLinkedinId ? { schoolLinkedinId } : {}),
      ...(schoolLogoUrl ? { schoolLogoUrl } : {}),
      ...(degree ? { degree } : {}),
      ...(description ? { description } : {}),
      ...dateRange,
    });
  }

  return entries;
}
