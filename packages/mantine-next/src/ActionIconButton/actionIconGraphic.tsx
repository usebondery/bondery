import { Center } from "@mantine/core";
import {
  cloneElement,
  isValidElement,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";

/** Default graphic scale inside Mantine `ActionIcon` (matches ThemeIcon icon inset). */
export const ACTION_ICON_GRAPHIC_SCALE = 0.7;

/**
 * Graphic passed to {@link ActionIconButton} / {@link ActionIconLink}.
 * Use a Tabler icon, `next/image`, or SVG without `size`, `stroke`, or fixed `width`/`height` —
 * the wrapper applies inset scaling from the ActionIcon `size` prop.
 */
export type ActionIconGraphic = ReactElement;

type NormalizableGraphicProps = {
  style?: CSSProperties;
  size?: number | string;
  width?: number | string;
  height?: number | string;
  stroke?: number | string;
};

const graphicFillStyle: CSSProperties = {
  display: "block",
  height: "100%",
  objectFit: "contain",
  width: "100%",
};

/**
 * Strips caller-supplied dimensions so scaling is controlled only by the ActionIcon box.
 */
export function normalizeActionIconGraphicChild(icon: ReactNode): ReactNode {
  if (!isValidElement(icon)) {
    return icon;
  }

  const element = icon as ReactElement<NormalizableGraphicProps>;
  const {
    size: _size,
    width: _width,
    height: _height,
    stroke: _stroke,
    style,
    ...rest
  } = element.props;

  return cloneElement(element, {
    ...rest,
    style: {
      ...style,
      ...graphicFillStyle,
    },
  });
}

/**
 * Centers an icon inside an ActionIcon hit target at a consistent fraction of the box.
 */
export function renderActionIconGraphic(
  icon: ReactNode,
  scale: number = ACTION_ICON_GRAPHIC_SCALE,
): ReactNode {
  const normalizedIcon = normalizeActionIconGraphicChild(icon);

  const scalePercent = `${scale * 100}%`;

  return (
    <Center style={{ height: "100%", width: "100%" }}>
      <span
        style={{
          alignItems: "center",
          display: "inline-flex",
          height: scalePercent,
          justifyContent: "center",
          position: "relative",
          width: scalePercent,
        }}
      >
        {normalizedIcon}
      </span>
    </Center>
  );
}
