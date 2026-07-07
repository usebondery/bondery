/**
 * LinkedIn Education types and SDUI DOM scraper re-export.
 */

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

export { extractSduiEducation as extractEducation } from "./sduiProfile";
