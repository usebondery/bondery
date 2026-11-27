import { BRAND_MARKS, type BrandMarkName, THEMED_BRAND_MARKS } from "@bondery/branding";
import { Box } from "@mantine/core";
import type { ReactElement } from "react";

const DEFAULT_MARK_SIZE_PX = 14;

interface BrandMarkProps {
  name: BrandMarkName;
  /** Width and height in px. Defaults to icon size. */
  size?: number;
}

/**
 * A brand mark at icon size. Marks with a light and a dark file render both, and
 * Mantine shows the one that matches the color scheme, so a dark logo never sits
 * on a dark surface. The mark is decorative: it has empty alt text, so the label
 * next to it names the brand.
 */
function BrandMark({ name, size = DEFAULT_MARK_SIZE_PX }: BrandMarkProps): ReactElement {
  if (name in THEMED_BRAND_MARKS) {
    const themed = THEMED_BRAND_MARKS[name as keyof typeof THEMED_BRAND_MARKS];

    return (
      <>
        <MarkImage darkHidden size={size} src={themed.light} />
        <MarkImage lightHidden size={size} src={themed.dark} />
      </>
    );
  }

  return (
    <MarkImage
      size={size}
      src={BRAND_MARKS[name as Exclude<BrandMarkName, keyof typeof THEMED_BRAND_MARKS>]}
    />
  );
}

type MarkImageProps = {
  darkHidden?: boolean;
  lightHidden?: boolean;
  size: number;
  src: string;
};

function MarkImage({ darkHidden, lightHidden, size, src }: MarkImageProps) {
  return (
    <Box
      alt=""
      component="img"
      darkHidden={darkHidden}
      height={size}
      lightHidden={lightHidden}
      src={src}
      // No inline `display`: it would override the Mantine rule that hides the
      // other theme's file. The parent is a flex container, so the image is
      // blockified and adds no baseline gap.
      style={{ flexShrink: 0, objectFit: "contain" }}
      width={size}
    />
  );
}

export { BrandMark, type BrandMarkProps };
