import type { ReactElement, ReactNode } from "react";
import { Heading, Text } from "react-email";
import { EmailCta } from "#shared/EmailCta.js";
import { descriptionStyle, headingStyle, notesStyle } from "#shared/email-styles.js";

type EmailBodyCta = {
  href: string;
  label: string;
};

function EmailNotes({ notes }: { notes: ReactNode }): ReactElement {
  if (typeof notes === "string") {
    return <Text style={notesStyle}>{notes}</Text>;
  }
  return <>{notes}</>;
}

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
      {notes !== null && notes !== undefined ? <EmailNotes notes={notes} /> : null}
    </>
  );
}

export type { EmailBodyCta };
