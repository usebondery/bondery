/**
 * LinkedIn Education types and SDUI DOM scraper re-export.
 */

export interface EducationEntry {
  degree?: string;
  description?: string;
  endDate?: string; // "YYYY-MM" or "YYYY" — undefined means ongoing
  /** LinkedIn school handle or numeric ID — used to build the canonical URL server-side */
  schoolLinkedinId?: string;
  schoolLogoUrl?: string;
  schoolName: string;
  startDate?: string; // "YYYY-MM" or "YYYY"
}

export { extractSduiEducation as extractEducation } from "./sduiProfile";
