import { Box } from "@mantine/core";
import { QRCodeSVG } from "qrcode.react";
import type { ReactElement } from "react";

const DEFAULT_QR_SIZE_PX = 192;

/** Quiet zone in modules. The QR spec asks for four. */
const QUIET_ZONE_MODULES = 4;

/** Light surface and dark modules in both themes. Phone scanners expect dark on light. */
const QR_BACKGROUND = "#ffffff";
const QR_FOREGROUND = "#000000";

interface QrCodeProps {
  /** Error correction. Higher levels survive more damage and make a denser code. */
  level?: "L" | "M" | "Q" | "H";
  /** Width and height in px. */
  size?: number;
  /** Accessible name of the image. Say what the code opens. */
  title: string;
  /** The text the code encodes. */
  value: string;
}

/**
 * A QR code as SVG. The code always draws dark modules on a white quiet zone, in
 * light and dark mode, because phone scanners fail on inverted codes.
 */
function QrCode({
  level = "M",
  size = DEFAULT_QR_SIZE_PX,
  title,
  value,
}: QrCodeProps): ReactElement {
  return (
    <Box display="inline-block" lh={0}>
      <QRCodeSVG
        bgColor={QR_BACKGROUND}
        fgColor={QR_FOREGROUND}
        level={level}
        marginSize={QUIET_ZONE_MODULES}
        size={size}
        title={title}
        value={value}
      />
    </Box>
  );
}

export { QrCode, type QrCodeProps };
