import React, { useState, useEffect } from "react";
import { browser } from "wxt/browser";
import { Button, Text } from "@mantine/core";
import { BonderyIconWhite } from "@bondery/branding";
import { WEBAPP_ROUTES } from "@bondery/helpers";
import { cleanPersonName } from "@bondery/helpers/name-utils";
import { config } from "../config";
import { extractWorkExperience, type WorkEntry } from "./workExperience";
import { extractEducation, type EducationEntry } from "./education";
import { fetchFullWorkHistory, fetchFullEducation } from "./fetchDetails";
const sanitizeName = cleanPersonName;
import type { AddPersonResult } from "../utils/messages";

// ─── Module-level scrape cache ───────────────────────────────────────────────
// Keyed by LinkedIn username. Populated once per profile visit and reused on
// subsequent renders / button clicks so the DOM is not queried repeatedly.
interface CachedProfile {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  profilePhotoUrl?: string;
  headline?: string;
  location?: string;
  workHistory: WorkEntry[];
  educationHistory: EducationEntry[];
  linkedinBio?: string;
}
export const profileCache = new Map<string, CachedProfile>();
const inflightScrapes = new Map<string, Promise<CachedProfile>>();

async function getOrScrapeProfile(
  username: string,
  extractFns: {
    extractProfileName: () => { firstName: string; middleName?: string; lastName?: string } | null;
    extractProfilePhotoUrl: () => string | null;
    extractHeadline: () => string | null;
    extractPlace: () => string | null;
  },
): Promise<CachedProfile> {
  if (profileCache.has(username)) {
    return profileCache.get(username)!;
  }
  // Deduplicate concurrent calls for the same username
  if (inflightScrapes.has(username)) {
    return inflightScrapes.get(username)!;
  }

  const promise = (async () => {
    const profileName = extractFns.extractProfileName();
    const profilePhotoUrl = extractFns.extractProfilePhotoUrl() ?? undefined;
    const headline = extractFns.extractHeadline() ?? undefined;
    const location = extractFns.extractPlace() ?? undefined;

    // Scrape the live DOM first (synchronous, free) to pre-seed logo URLs.
    // Passing these into fetchFullWorkHistory lets enrichEntriesWithLogos skip
    // Voyager API calls for any company whose logo is already visible in the DOM.
    const domWork = extractWorkExperience();
    const domLogosByCompany = new Map<string, string>();
    for (const dw of domWork) {
      if (dw.companyLogoUrl && dw.companyName) {
        domLogosByCompany.set(dw.companyName.toLowerCase(), dw.companyLogoUrl);
      }
    }

    // Attempt to fetch the full details pages for complete work/education history.
    // Falls back to scraping the (truncated) live DOM if the fetch fails.
    const [fetchedWork, fetchedEdu] = await Promise.all([
      fetchFullWorkHistory(username, domLogosByCompany),
      fetchFullEducation(username),
    ]);
    console.log(
      `[linkedin][button] Fetch results: ${fetchedWork.length} work, ${fetchedEdu.length} edu` +
        ` — using ${fetchedWork.length > 0 ? "fetched" : "live DOM"} work,` +
        ` ${fetchedEdu.length > 0 ? "fetched" : "live DOM"} edu`,
    );

    const workHistory = fetchedWork.length > 0 ? fetchedWork : domWork;

    const educationHistory = fetchedEdu.length > 0 ? fetchedEdu : extractEducation();

    const linkedinBio = (() => {
      const heading = document.getElementById("about");
      if (!heading) return undefined;
      const section = heading.closest("section");
      if (!section) return undefined;
      // LinkedIn renders the bio text inside a visually-hidden span inside the about section.
      // The class name is obfuscated and may change; fall back to a broader selector.
      const textSpans = Array.from(
        section.querySelectorAll<HTMLElement>('span[aria-hidden="true"]'),
      ).filter((el) => el.closest("a") === null && (el.textContent?.trim().length ?? 0) > 20);
      if (textSpans.length === 0) return undefined;
      // Use the span with the most text content as the bio.
      const bioSpan = textSpans.reduce((a, b) =>
        (a.textContent?.length ?? 0) >= (b.textContent?.length ?? 0) ? a : b,
      );
      const clone = bioSpan.cloneNode(true) as HTMLElement;
      clone.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
      return clone.textContent?.trim() || undefined;
    })();

    const cached: CachedProfile = {
      firstName: profileName?.firstName,
      middleName: profileName?.middleName,
      lastName: profileName?.lastName,
      profilePhotoUrl,
      headline,
      location,
      workHistory,
      educationHistory,
      linkedinBio,
    };
    profileCache.set(username, cached);
    console.log("[linkedin][button] Profile scraped and cached for", username, cached);
    return cached;
  })();

  inflightScrapes.set(username, promise);
  try {
    return await promise;
  } finally {
    inflightScrapes.delete(username);
  }
}

// ─── Standalone DOM extract helpers (module-level, shared with content script) ─

/**
 * Extracts the profile photo URL from the LinkedIn top-card section.
 * Language-agnostic: iterates buttons (photo is always in a button) rather than
 * relying on localised aria-labels like "profile picture".
 */
export function extractProfilePhotoUrl(): string | null {
  const topCard = document.querySelector("section[data-member-id]") || document.body;

  // Strategy 1: any button inside the top-card containing an <img> with a real src.
  const buttons = topCard.querySelectorAll<HTMLButtonElement>("button");
  for (const btn of buttons) {
    const img = btn.querySelector("img") as HTMLImageElement | null;
    if (img?.src && !img.src.includes("data:image")) {
      return img.src;
    }
  }

  // Strategy 2: data-view-name container
  const memberPhotoContainer = document.querySelector(
    '[data-view-name="profile-top-card-member-photo"]',
  );
  if (memberPhotoContainer) {
    const img =
      (memberPhotoContainer.querySelector('img[data-loaded="true"]') as HTMLImageElement | null) ??
      (memberPhotoContainer.querySelector("img") as HTMLImageElement | null);
    if (img?.src && !img.src.includes("data:image")) {
      return img.src;
    }
  }

  // Strategy 3: stable class-based selectors (may drift over time)
  const fallbacks = [
    ".pv-top-card-profile-picture__image",
    "[data-anonymize='headshot-photo']",
    "img.profile-photo-edit__preview",
  ];
  for (const selector of fallbacks) {
    const img = document.querySelector(selector) as HTMLImageElement | null;
    if (img?.src && !img.src.includes("data:image")) {
      return img.src;
    }
  }

  return null;
}

interface LinkedInButtonProps {
  username: string;
}

const LinkedInButton: React.FC<LinkedInButtonProps> = ({ username }) => {
  const [isLoading, setIsLoading] = useState(false);
  // True while the background cache-warmup scrape is in flight so the button
  // shows as loading from the moment it mounts until the data is ready.
  const [isPreloading, setIsPreloading] = useState(!profileCache.has(username));

  useEffect(() => {
    // Warm the cache on mount so data is ready before the button is clicked.
    // Subsequent mounts for the same username return the cached value immediately.
    if (profileCache.has(username)) {
      setIsPreloading(false);
      return;
    }
    setIsPreloading(true);
    getOrScrapeProfile(username, {
      extractProfileName,
      extractProfilePhotoUrl,
      extractHeadline,
      extractPlace,
    }).finally(() => setIsPreloading(false));
  }, [username]);

  const extractProfileName = (): {
    firstName: string;
    middleName?: string;
    lastName?: string;
  } | null => {
    const topCard = document.querySelector("section[data-member-id]") || document;
    const nameElement = topCard.querySelector("a[aria-label] > h1") || topCard.querySelector("h1");

    console.log("LinkedIn: Name element found:", !!nameElement, nameElement?.textContent);

    if (!nameElement || !nameElement.textContent) {
      // Try alternative selectors
      const alternatives = [
        "h1.text-heading-xlarge",
        ".pv-text-details__left-panel h1",
        "[data-anonymize='person-name']",
      ];

      for (const selector of alternatives) {
        const altElement = document.querySelector(selector);
        if (altElement?.textContent) {
          console.log(
            `LinkedIn: Found name using alternative selector: ${selector}`,
            altElement.textContent,
          );
          const fullName = sanitizeName(altElement.textContent.trim());
          if (fullName) {
            const nameParts = fullName.split(/\s+/);
            if (nameParts.length === 1) return { firstName: nameParts[0] };
            if (nameParts.length === 2) return { firstName: nameParts[0], lastName: nameParts[1] };
            return {
              firstName: nameParts[0],
              lastName: nameParts[nameParts.length - 1],
              middleName: nameParts.slice(1, -1).join(" "),
            };
          }
        }
      }
      return null;
    }

    const fullName = sanitizeName(nameElement.textContent.trim());

    if (!fullName) {
      // Fallback to username if name is empty after sanitization
      return { firstName: username };
    }

    const nameParts = fullName.split(/\s+/);

    if (nameParts.length === 0) return null;

    if (nameParts.length === 1) {
      return { firstName: nameParts[0] };
    }

    if (nameParts.length === 2) {
      return { firstName: nameParts[0], lastName: nameParts[1] };
    }

    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];
    const middleName = nameParts.slice(1, -1).join(" ");

    return { firstName, lastName, middleName };
  };

  const extractHeadline = (): string | null => {
    const topCard = document.querySelector("section[data-member-id]") || document;
    const titleElement = topCard.querySelector("div[data-generated-suggestion-target]");

    if (titleElement && titleElement.textContent) {
      return titleElement.textContent.trim();
    }

    // Try alternative selectors
    const alternatives = [
      ".text-body-medium.break-words",
      ".pv-text-details__left-panel .text-body-medium",
      "[data-anonymize='headline']",
    ];

    for (const selector of alternatives) {
      const altElement = document.querySelector(selector);
      if (altElement?.textContent) {
        return altElement.textContent.trim();
      }
    }

    return null;
  };

  const extractPlace = (): string | null => {
    const topCard = document.querySelector("section[data-member-id]") || document;
    const contactInfoLink = topCard.querySelector("#top-card-text-details-contact-info");
    const placeElement = contactInfoLink?.parentElement?.previousElementSibling || null;

    if (placeElement && placeElement.textContent) {
      return placeElement.textContent.trim();
    }

    // Try alternative selectors
    const alternatives = [
      ".pv-text-details__left-panel .text-body-small.inline",
      "[data-anonymize='location']",
      ".pb2.pv-text-details__left-panel span.text-body-small",
    ];

    for (const selector of alternatives) {
      const altElement = document.querySelector(selector);
      if (altElement?.textContent) {
        return altElement.textContent.trim();
      }
    }

    return null;
  };

  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsLoading(true);
    setStatusMessage(null);

    try {
      const profile = await getOrScrapeProfile(username, {
        extractProfileName,
        extractProfilePhotoUrl,
        extractHeadline,
        extractPlace,
      });

      console.log("[linkedin][button] Sending ADD_PERSON_REQUEST:", profile);

      const { workHistory, educationHistory } = profile;
      console.log(
        "[linkedin][button] Sending ADD_PERSON_REQUEST with",
        workHistory.length,
        "work history entries,",
        educationHistory.length,
        "education entries",
      );

      const result: AddPersonResult = await browser.runtime.sendMessage({
        type: "ADD_PERSON_REQUEST",
        payload: {
          platform: "linkedin" as const,
          handle: username,
          firstName: profile.firstName,
          middleName: profile.middleName,
          lastName: profile.lastName,
          profileImageUrl: profile.profilePhotoUrl,
          headline: profile.headline,
          location: profile.location,
          workHistory,
          educationHistory,
          linkedinBio: profile.linkedinBio,
        },
      });

      if (result.payload.success) {
        // For existing contacts the background shows a popup — open the tab here.
        // For new contacts the background already opens the tab via chrome.tabs.create,
        // so we must NOT call window.open to avoid a duplicate tab.
        if (result.payload.existed) {
          window.open(
            `${config.appUrl}${WEBAPP_ROUTES.PERSON}/${result.payload.contactId}`,
            "_blank",
          );
        }
        return;
      } else {
        if (result.payload.requiresAuth) {
          setStatusMessage("Sign in required — click the Bondery icon");
        } else {
          setStatusMessage(result.payload.error ?? "Something went wrong");
        }
      }
    } catch (error) {
      console.error("Error opening in Bondery:", error);
      setStatusMessage("Extension error — try again");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/*
       * overflow:clip (not hidden) clips the button-scale-effect hover
       * transform at the wrapper boundary without creating a scroll
       * container or affecting the host page layout, so LinkedIn's
       * action bar doesn't get a permanent horizontal scrollbar.
       */}
      <div style={{ overflow: "clip", borderRadius: "var(--mantine-radius-xl)" }}>
        <Button
          onClick={handleClick}
          loading={isLoading || isPreloading}
          radius="xl"
          size="lg"
          leftSection={<BonderyIconWhite width={14} height={14} />}
        >
          Open in Bondery
        </Button>
      </div>
      {statusMessage && (
        <Text size="xs" c="dimmed" ta="center" mt={4}>
          {statusMessage}
        </Text>
      )}
    </>
  );
};

export default LinkedInButton;
