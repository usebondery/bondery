import type { ReactElement, ReactNode } from "react";
import { Heading, Text } from "react-email";
import { EmailCta } from "#shared/EmailCta.js";
import { descriptionStyle, headingStyle, notesStyle } from "#shared/email-styles.js";

export type EmailBodyCta = {
  href: string;
  label: string;
};

export function EmailBody({
  children,
  cta,
  description,
  heading,
  notes,
}: {
  children?: ReactNode;
  cta?: EmailBodyCta;
  description?: string;
  heading: string;
  notes?: ReactNode;
}): ReactElement {
  return (
    <>
      <Heading as="h1" style={headingStyle}>
        {heading}
      </Heading>
      {description ? <Text style={descriptionStyle}>{description}</Text> : null}
      {children}
      {cta ? <EmailCta href={cta.href} label={cta.label} /> : null}
      {typeof notes === "string" ? <Text style={notesStyle}>{notes}</Text> : notes}
    </>
  );
}
