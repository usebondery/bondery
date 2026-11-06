import "../marketing.css";
import { Box, Flex } from "@mantine/core";
import { Footer, Header } from "@/components/landing";
import { MantineShell } from "@/components/mantine-shell";

/**
 * Site chrome for every public page: providers, header, and footer.
 * The layout owns the single `main` element. Pages own their width and columns
 * through `SiteShell`.
 */
export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <MantineShell>
      <Flex direction="column" mih="100dvh">
        <Header />
        <Box component="main" flex="1 1 auto">
          {children}
        </Box>
        <Footer />
      </Flex>
    </MantineShell>
  );
}
