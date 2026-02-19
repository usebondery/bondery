import {
  Html,
  Head,
  pixelBasedPreset,
  Tailwind,
  Preview,
  Container,
  Font,
} from "@react-email/components";
import { primaryColor } from "@bondery/mantine-next";
import * as React from "react";
import { BonderyLogotypeBlack } from "@bondery/branding/react/src";

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
          fontFamily="Lexend"
          fallbackFontFamily={"sans-serif"}
          webFont={{
            url: "https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;700&display=swap",
            format: "woff2",
          }}
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      <Preview>{preview}</Preview>
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
          theme: {
            extend: {
              colors: {
                brand: primaryColor,
              },
            },
          },
        }}
      >
        {children}
        <Container className="mx-auto mt-24 mb-16 text-center">
          <BonderyLogotypeBlack width={160} height={48} />
        </Container>
      </Tailwind>
    </Html>
  );
};
