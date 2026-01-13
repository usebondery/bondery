import React, { useState, useEffect } from "react";
import { Button } from "@mantine/core";
import { config } from "../config";
import { BondeeIconWhite } from "@bondery/branding";
import { sanitizeName } from "../utils/nameHelpers";

interface FacebookButtonProps {
  username: string;
}

const FacebookButton: React.FC<FacebookButtonProps> = ({ username }) => {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    console.log("Facebook Button mounted for username:", username);

    // Log all extracted information immediately on mount
    const profileName = extractProfileName();
    const profilePhotoUrl = extractProfilePhotoUrl();

    console.log("Facebook Profile Extraction Results:", {
      username,
      profileName,
      profilePhotoUrl,
    });
  }, [username]);

  const extractProfileName = (): {
    firstName: string;
    middleName?: string;
    lastName?: string;
  } | null => {
    // Find the main h1 at the top level (not in comments or posts)
    const allH1s = document.querySelectorAll("h1");

    for (const h1 of Array.from(allH1s)) {
      const text = h1.textContent?.trim();
      console.log("Facebook: Checking h1:", text);

      // Skip navigation/UI elements
      if (!text || ["Notifications", "Messages", "Menu", "Settings", "Search"].includes(text)) {
        continue;
      }

      // Skip if h1 is inside a post or comment (these have role="article")
      const isInPost = h1.closest('[role="article"]');
      if (isInPost) {
        console.log("Facebook: Skipping h1 inside post:", text);
        continue;
      }

      // This should be the profile name
      const fullName = sanitizeName(text);
      if (fullName && fullName.length > 1) {
        console.log("Facebook: Found profile name:", fullName);
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

    // Fallback: use username
    console.log("Facebook: No valid name found, using username");
    return { firstName: username };
  };

  const extractProfilePhotoUrl = (): string | null => {
    // Find SVG images - profile photos are in SVG image elements
    const svgImages = document.querySelectorAll("svg image[xlink\\:href]");
    const validPhotos: { href: string; size: number; inArticle: boolean; index: number }[] = [];

    let index = 0;
    for (const image of Array.from(svgImages)) {
      const href = (image as SVGImageElement).getAttribute("xlink:href");

      if (href && !href.includes("data:image") && href.includes("scontent")) {
        const inArticle = image.closest('[role="article"]') !== null;

        // Check the image element's style attribute for dimensions
        const imageStyle = (image as SVGImageElement).getAttribute("style") || "";
        let width = 0;
        let height = 0;

        // Extract from inline style (e.g., "height: 168px; width: 168px;")
        const styleWidthMatch = imageStyle.match(/width:\s*(\d+)px/);
        const styleHeightMatch = imageStyle.match(/height:\s*(\d+)px/);

        if (styleWidthMatch && styleHeightMatch) {
          width = parseInt(styleWidthMatch[1]);
          height = parseInt(styleHeightMatch[1]);
        } else {
          // Try width/height attributes on the image element
          const attrWidth = (image as SVGImageElement).getAttribute("width");
          const attrHeight = (image as SVGImageElement).getAttribute("height");
          if (attrWidth && attrHeight && !attrWidth.includes("%") && !attrHeight.includes("%")) {
            width = parseInt(attrWidth);
            height = parseInt(attrHeight);
          }
        }

        console.log(`Facebook: SVG image #${index}:`, {
          href: href.substring(0, 80),
          width,
          height,
          inArticle,
          index,
        });

        // Only collect images that are:
        // 1. Square-ish (ratio between 0.8 and 1.2)
        // 2. At least 100px (profile photos, not tiny avatars)
        // 3. NOT inside an article (posts/comments)
        if (width > 0 && height > 0) {
          const ratio = width / height;
          if (ratio > 0.8 && ratio < 1.2 && width >= 100 && !inArticle) {
            validPhotos.push({ href, size: width, inArticle, index });
          }
        }

        index++;
      }
    }

    // Sort by: 1) larger size, 2) earlier in document
    validPhotos.sort((a, b) => {
      // Prefer larger sizes
      if (a.size !== b.size) return b.size - a.size;
      // Then prefer images that appear earlier in the DOM
      return a.index - b.index;
    });

    console.log("Facebook: Valid profile photos (100px+, not in articles):", validPhotos);

    if (validPhotos.length > 0) {
      console.log("Facebook: Selected profile photo:", validPhotos[0]);
      return validPhotos[0].href;
    }

    // Fallback: Look for large img elements
    const allImages = document.querySelectorAll(
      "img[src*='scontent']",
    ) as NodeListOf<HTMLImageElement>;
    const largestSquareImages: { img: HTMLImageElement; size: number }[] = [];

    for (const img of Array.from(allImages)) {
      if (img.naturalWidth && img.naturalHeight) {
        const ratio = img.naturalWidth / img.naturalHeight;
        if (ratio > 0.8 && ratio < 1.2 && img.naturalWidth >= 100) {
          largestSquareImages.push({ img, size: img.naturalWidth });
        }
      }
    }

    largestSquareImages.sort((a, b) => b.size - a.size);

    if (largestSquareImages.length > 0) {
      console.log("Facebook: Found profile photo (img):", largestSquareImages[0].img.src);
      return largestSquareImages[0].img.src;
    }

    console.log("Facebook: No profile photo found");
    return null;
  };

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsLoading(true);

    try {
      const profileName = extractProfileName();
      const profilePhotoUrl = extractProfilePhotoUrl();

      console.log("Facebook Profile Data:", {
        username,
        name: profileName,
        profilePicture: profilePhotoUrl,
      });

      // Build URL with all data as search params
      const params = new URLSearchParams({
        facebook: username,
        ...(profileName?.firstName && { firstName: profileName.firstName }),
        ...(profileName?.middleName && { middleName: profileName.middleName }),
        ...(profileName?.lastName && { lastName: profileName.lastName }),
        ...(profilePhotoUrl && { profileImageUrl: profilePhotoUrl }),
      });

      // Single redirect with all data
      window.open(`${config.appUrl}/api/redirect?${params.toString()}`, "_blank");
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
      size="sm"
      mt={"xs"}
      leftSection={<BondeeIconWhite width={16} height={16} />}
    >
      Open in Bondery
    </Button>
  );
};

export default FacebookButton;
