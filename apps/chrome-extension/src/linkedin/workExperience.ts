/**
 * LinkedIn Work Experience types, date parsing, and SDUI DOM scraper re-export.
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
