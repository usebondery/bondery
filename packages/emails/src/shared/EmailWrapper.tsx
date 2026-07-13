import { BRAND_PRIMARY_COLOR } from "@bondery/branding";
import { BonderyLogotypeBlack } from "@bondery/branding/react";
import type * as React from "react";
import { Container, Font, Head, Html, Preview, pixelBasedPreset, Tailwind } from "react-email";

export const EmailWrapper = ({
  children,
  preview,
}: {
  children: React.ReactNode;
  preview: string;
}) => {
  return (
    <Html>
      <Head>
        <Font
          fallbackFontFamily={"sans-serif"}
          fontFamily="Lexend"
          fontStyle="normal"
          fontWeight={400}
          webFont={{
            format: "woff2",
            url: "https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;700&display=swap",
          }}
        />
      </Head>
      <Preview>{preview}</Preview>
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
          theme: {
            extend: {
              colors: {
                brand: BRAND_PRIMARY_COLOR,
              },
            },
          },
        }}
      >
        {children}
        <Container className="mx-auto mt-24 mb-16 text-center">
          <BonderyLogotypeBlack height={48} width={160} />
        </Container>
      </Tailwind>
    </Html>
  );
};
