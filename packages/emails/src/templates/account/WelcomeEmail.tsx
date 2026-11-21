import type { ReactElement } from "react";
import { defaultWelcomeCopy } from "#fixtures/default-copy.js";
import { DEFAULT_APP_URL, type EmailDocumentProps } from "#shared/chrome.js";
import { EmailBody } from "#shared/EmailBody.js";
import { EmailWrapper } from "#shared/EmailWrapper.js";

export interface WelcomeEmailCopy {
  body: string;
  getStarted: string;
  heading: string;
  preview: string;
  whyReceiving: string;
}

export interface WelcomeEmailProps extends EmailDocumentProps {
  appUrl: string;
  copy?: WelcomeEmailCopy;
}

export default function WelcomeEmail({
  appUrl = DEFAULT_APP_URL,
  chrome,
  copy = defaultWelcomeCopy,
  dir,
  lang,
  title,
  websiteUrl,
}: WelcomeEmailProps): ReactElement {
  return (
    <EmailWrapper
      chrome={chrome}
      dir={dir}
      lang={lang}
      preview={copy.preview}
      title={title ?? copy.heading}
      websiteUrl={websiteUrl}
    >
      <EmailBody
        cta={{ href: appUrl, label: copy.getStarted }}
        description={copy.body}
        heading={copy.heading}
        notes={copy.whyReceiving}
      />
    </EmailWrapper>
  );
}
