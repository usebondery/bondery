import { Box, type MantineSpacing, type StyleProp } from "@mantine/core";

interface PageWrapperProps {
  children: React.ReactNode;
  /** Fill the shell viewport. Use on a page whose body is a locked canvas. */
  fill?: boolean;
  /**
   * Page gutter. The shell already insets content by `md`, so a phone page that
   * packs cards in a row passes a smaller `base` value.
   * @defaultValue "xl"
   */
  p?: StyleProp<MantineSpacing>;
}

export function PageWrapper({ children, fill = false, p = "xl" }: PageWrapperProps) {
  return (
    <Box
      h={fill ? "100%" : undefined}
      mih={fill ? 0 : undefined}
      p={p}
      style={
        fill ? { boxSizing: "border-box", display: "flex", flexDirection: "column" } : undefined
      }
    >
      {children}
    </Box>
  );
}
