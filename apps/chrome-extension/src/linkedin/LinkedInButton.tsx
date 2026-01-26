import React, { useState, useEffect } from "react";
import { Button } from "@mantine/core";
import { config } from "../config";
import { BonderyIconWhite } from "@bondery/branding";
import { sanitizeName } from "../utils/nameHelpers";
import { API_ROUTES } from "@bondery/helpers";

interface LinkedInButtonProps {
  username: string;
}

const LinkedInButton: React.FC<LinkedInButtonProps> = ({ username }) => {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    console.log("LinkedIn Button mounted for username:", username);

    // Log all extracted information immediately on mount
    const profileName = extractProfileName();
    const profilePhotoUrl = extractProfilePhotoUrl();
    const title = extractTitle();
    const place = extractPlace();

    console.log("LinkedIn Profile Extraction Results:", {
      username,
      profileName,
      title,
      place,
      profilePhotoUrl,
    });
  }, [username]);

  const extractProfileName = (): {
    firstName: string;
    middleName?: string;
    lastName?: string;
  } | null => {
    const nameElement = document.querySelector(
      ".c60ffaab._366d02d6.ac0607af.d51d7eb8._11a23dae._2c1226b1._76473fa0._5355b5e1._6c707a2b.a464cddf",
    );

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

  const extractTitle = (): string | null => {
    const titleElement = document.querySelector(
      ".c60ffaab._11719c59._6c492f0e._37f22e5b.d51d7eb8._11a23dae.be840cb5._76473fa0._5355b5e1._6c707a2b.a464cddf",
    );

    console.log("LinkedIn: Title element found:", !!titleElement, titleElement?.textContent);

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
        console.log(
          `LinkedIn: Found title using alternative selector: ${selector}`,
          altElement.textContent,
        );
        return altElement.textContent.trim();
      }
    }

    return null;
  };

  const extractPlace = (): string | null => {
    const placeElement = document.querySelector(
      ".c60ffaab.e07d664e.d51d7eb8._11a23dae.be840cb5._76473fa0._5355b5e1.a4423918.a464cddf",
    );

    console.log("LinkedIn: Place element found:", !!placeElement, placeElement?.textContent);

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
        console.log(
          `LinkedIn: Found place using alternative selector: ${selector}`,
          altElement.textContent,
        );
        return altElement.textContent.trim();
      }
    }

    return null;
  };

  const extractProfilePhotoUrl = (): string | null => {
    // Find image inside element with data-view-name="profile-top-card-member-photo"
    const memberPhotoContainer = document.querySelector(
      '[data-view-name="profile-top-card-member-photo"]',
    );

    if (memberPhotoContainer) {
      const img = memberPhotoContainer.querySelector('img[data-loaded="true"]') as HTMLImageElement;
      console.log("LinkedIn: Profile photo element found (member-photo):", !!img, img?.src);

      if (img?.src && !img.src.includes("data:image")) {
        return img.src;
      }
    }

    // Fallback to original selector
    const img = document.querySelector(
      "img._021a4e24.a4f8c248.ad272af2._8d269092._00859a34",
    ) as HTMLImageElement;

    console.log("LinkedIn: Profile photo element found (fallback):", !!img, img?.src);

    if (img && img.src && !img.src.includes("data:image")) {
      return img.src;
    }

    // Try alternative selectors
    const alternatives = [
      ".pv-top-card-profile-picture__image",
      "[data-anonymize='headshot-photo']",
      "img.profile-photo-edit__preview",
    ];

    for (const selector of alternatives) {
      const altImg = document.querySelector(selector) as HTMLImageElement;
      if (altImg?.src && !altImg.src.includes("data:image")) {
        console.log(`LinkedIn: Found photo using alternative selector: ${selector}`, altImg.src);
        return altImg.src;
      }
    }

    return null;
  };

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsLoading(true);

    try {
      const profileName = extractProfileName();
      const profilePhotoUrl = extractProfilePhotoUrl();
      const title = extractTitle();
      const place = extractPlace();

      // Log extracted data
      console.log("LinkedIn Profile Data:", {
        username,
        name: profileName,
        title,
        place,
        profilePicture: profilePhotoUrl,
      });

      // Build URL with all data as search params
      const params = new URLSearchParams({
        linkedin: username,
        ...(profileName?.firstName && { firstName: profileName.firstName }),
        ...(profileName?.middleName && { middleName: profileName.middleName }),
        ...(profileName?.lastName && { lastName: profileName.lastName }),
        ...(title && { title }),
        ...(place && { place }),
        ...(profilePhotoUrl && { profileImageUrl: profilePhotoUrl }),
      });

      // Single redirect with all data
      window.open(`${config.appUrl}${API_ROUTES.REDIRECT}?${params.toString()}`, "_blank");
    } catch (error) {
      console.error("Error opening in Bondery:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleClick}
      loading={isLoading}
      fullWidth
      size="xl"
      leftSection={<BonderyIconWhite width={16} height={16} />}
    >
      Open in Bondery
    </Button>
  );
};

export default LinkedInButton;
