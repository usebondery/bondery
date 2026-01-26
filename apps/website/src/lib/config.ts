/**
 * Application configuration constants for website
 */

import { WEBSITE_ROUTES } from "@bondery/helpers";

/**
 * Web app URL
 * Uses environment variable
 *
 */
export const WEBAPP_URL = process.env.NEXT_PUBLIC_WEBAPP_URL!;

/**
 * Website URL
 * Uses environment variable
 * */
export const WEBSITE_URL = process.env.NEXT_PUBLIC_WEBSITE_URL!;
/**
 * Social media links
 */
export const SOCIAL_LINKS = {
  github: "https://github.com/sveetya/bondery",
  linkedin: "https://www.linkedin.com/company/bondery",
  email: "team@usebondery.com",
} as const;
