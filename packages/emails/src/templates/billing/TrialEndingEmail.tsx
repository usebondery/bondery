import { WEBAPP_ROUTES } from "@bondery/helpers";
import type { ReactElement } from "react";
import { defaultTrialEndingCopy } from "#fixtures/default-copy.js";
import { DEFAULT_APP_URL, type EmailDocumentProps } from "#shared/chrome.js";
import { EmailBody } from "#shared/EmailBody.js";
import { EmailWrapper } from "#shared/EmailWrapper.js";

export interface TrialEndingEmailCopy {
  body: string;
  cta: string;
  heading: string;
  preview: string;
  whyReceiving: string;
}

export interface TrialEndingEmailProps extends EmailDocumentProps {
  copy?: TrialEndingEmailCopy;
  formattedEndDate: string;
  settingsUrl?: string;
}

export default function TrialEndingEmail({
  chrome,
  copy = defaultTrialEndingCopy,
  dir,
  formattedEndDate = "January 1, 2026",
  lang,
  settingsUrl = `${DEFAULT_APP_URL}${WEBAPP_ROUTES.SETTINGS}`,
  title,
  websiteUrl,
}: TrialEndingEmailProps): ReactElement {
  const heading = copy.heading.replace("{{endDate}}", formattedEndDate);
  const body = copy.body.replace("{{endDate}}", formattedEndDate);

  return (
    <EmailWrapper
      chrome={chrome}
      dir={dir}
      lang={lang}
      preview={copy.preview}
      title={title ?? heading}
      websiteUrl={websiteUrl}
    >
      <EmailBody
        cta={{ href: settingsUrl, label: copy.cta }}
        description={body}
        heading={heading}
        notes={copy.whyReceiving}
      />
    </EmailWrapper>
  );
}
