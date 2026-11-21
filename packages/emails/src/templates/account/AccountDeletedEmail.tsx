import type { ReactElement } from "react";
import { Text } from "react-email";
import { defaultAccountDeletedCopy } from "#fixtures/default-copy.js";
import type { EmailDocumentProps } from "#shared/chrome.js";
import { EmailBody } from "#shared/EmailBody.js";
import { EmailWrapper } from "#shared/EmailWrapper.js";
import { descriptionStyle } from "#shared/email-styles.js";

export interface AccountDeletedEmailCopy {
  body: string;
  feedback: string;
  heading: string;
  preview: string;
  thanks: string;
}

export interface AccountDeletedEmailProps extends EmailDocumentProps {
  copy?: AccountDeletedEmailCopy;
}

export default function AccountDeletedEmail({
  chrome,
  copy = defaultAccountDeletedCopy,
  dir,
  lang,
  title,
  websiteUrl,
}: AccountDeletedEmailProps): ReactElement {
  return (
    <EmailWrapper
      chrome={chrome}
      dir={dir}
      lang={lang}
      preview={copy.preview}
      title={title ?? copy.heading}
      websiteUrl={websiteUrl}
    >
      <EmailBody heading={copy.heading}>
        <Text style={descriptionStyle}>{copy.body}</Text>
        <Text style={descriptionStyle}>{copy.feedback}</Text>
        <Text style={descriptionStyle}>{copy.thanks}</Text>
      </EmailBody>
    </EmailWrapper>
  );
}
