/**
 * LinkedIn Work Experience types, date parsing, and SDUI DOM scraper re-export.
 */

export interface WorkEntry {
  /** LinkedIn company handle or numeric ID — used to build the canonical URL server-side */
  companyLinkedinId?: string;
  companyLogoUrl?: string;
  companyName: string;
  companyUrn?: string; // Internal: Voyager URN used for logo resolution, not sent to API
  description?: string; // Free-text description/notes for the role
  employmentType?: string; // e.g. "Full-time", "Part-time", "Internship"
  endDate?: string; // "YYYY-MM" or "YYYY" — undefined means present
  location?: string; // e.g. "Praha, Česko"
  startDate?: string; // "YYYY-MM" or "YYYY"
  title: string;
}

// Month name → zero-padded number. Keys are lowercase for case-insensitive lookup.
// Covers: English, Czech, German, French, Spanish, Portuguese, Dutch, Italian, Polish.
const MONTH_ABBR: Record<string, string> = {
  abr: "04",
  ago: "08",
  août: "08",
  apr: "04",
  aug: "08",
  august: "08",
  avr: "04",
  březen: "03",
  cze: "06",
  dec: "12",
  dez: "12",
  dezember: "12",
  dic: "12",
  duben: "04",
  déc: "12",
  // Spanish
  ene: "01",
  feb: "02",
  februar: "02",
  // Portuguese
  fev: "02",
  févr: "02",
  // Italian
  gen: "01",
  giu: "06",
  gru: "12",
  // English
  jan: "01",
  // German
  januar: "01",
  // French
  janv: "01",
  juil: "07",
  juin: "06",
  jul: "07",
  juli: "07",
  jun: "06",
  juni: "06",
  květen: "05",
  kwi: "04",
  // Czech
  leden: "01",
  lip: "07",
  lis: "11",
  listopad: "11",
  lug: "07",
  lut: "02",
  mag: "05",
  mai: "05",
  mar: "03",
  mars: "03",
  may: "05",
  mei: "05",
  // Dutch
  mrt: "03",
  mrz: "03",
  märz: "03",
  nov: "11",
  november: "11",
  oct: "10",
  okt: "10",
  oktober: "10",
  ott: "10",
  out: "10",
  paź: "10",
  prosinec: "12",
  sep: "09",
  sept: "09",
  september: "09",
  set: "09",
  sie: "08",
  srpen: "08",
  // Polish
  sty: "01",
  wrz: "09",
  září: "09",
  únor: "02",
  červen: "06",
  červenec: "07",
  říjen: "10",
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

function _isDateText(text: string): boolean {
  // Language-agnostic: a date span always contains a 4-digit year (1970–2039)
  // combined with either a range separator (–/—) or a bullet (·), or is a bare year.
  if (!/\b(19[7-9]\d|20[0-3]\d)\b/.test(text)) {
    return false;
  }
  return /[–—·]/.test(text) || /^\s*(19|20)\d{2}\s*$/.test(text);
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

export { extractSduiWorkHistory as extractWorkExperience } from "./sduiProfile";
