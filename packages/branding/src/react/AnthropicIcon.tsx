import type { CSSProperties, ImgHTMLAttributes } from "react";

/**
 * Official Anthropic / Claude logomark.
 *
 * The SVG in `src/assets/brands/anthropic.svg` is the source. This wrapper
 * only sizes it, and optionally recolors it with a CSS mask.
 */
export const ANTHROPIC_MARK_COLOR = "#D97757";

const ANTHROPIC_MARK_SRC = new URL("../assets/brands/anthropic.svg", import.meta.url).href;

export type AnthropicIconProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "alt" | "height" | "src" | "width"
> & {
  /** Fill when the official orange cannot sit on the surface. */
  color?: string;
  size?: number | string;
};

export function AnthropicIcon({ color, size = 24, style, ...props }: AnthropicIconProps) {
  if (color && color !== ANTHROPIC_MARK_COLOR) {
    return (
      <span
        aria-hidden="true"
        style={{
          backgroundColor: color,
          display: "inline-block",
          flexShrink: 0,
          height: size,
          maskImage: `url(${ANTHROPIC_MARK_SRC})`,
          maskRepeat: "no-repeat",
          maskSize: "contain",
          WebkitMaskImage: `url(${ANTHROPIC_MARK_SRC})`,
          WebkitMaskRepeat: "no-repeat",
          WebkitMaskSize: "contain",
          width: size,
          ...style,
        }}
      />
    );
  }

  return (
    <img
      alt=""
      height={size}
      src={ANTHROPIC_MARK_SRC}
      style={{ display: "block", flexShrink: 0, ...style } satisfies CSSProperties}
      width={size}
      {...props}
    />
  );
}
