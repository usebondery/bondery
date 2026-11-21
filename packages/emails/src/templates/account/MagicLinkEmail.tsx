import type { ReactElement } from "react";
import { Text } from "react-email";
import { defaultMagicLinkCopy } from "#fixtures/default-copy.js";
import type { EmailDocumentProps } from "#shared/chrome.js";
import { EmailBody } from "#shared/EmailBody.js";
import { EmailWrapper } from "#shared/EmailWrapper.js";
import { notesStyle } from "#shared/email-styles.js";

export interface MagicLinkEmailCopy {
  body: string;
  cta: string;
  heading: string;
  ignore: string;
  preview: string;
  whyReceiving: string;
}

export interface MagicLinkEmailProps extends EmailDocumentProps {
  copy?: MagicLinkEmailCopy;
  url: string;
}

export default function MagicLinkEmail({
  chrome,
  copy = defaultMagicLinkCopy,
  dir,
  lang,
  title,
  url = "https://app.usebondery.com/auth/start",
  websiteUrl,
}: MagicLinkEmailProps): ReactElement {
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
        cta={{ href: url, label: copy.cta }}
        description={copy.body}
        heading={copy.heading}
        notes={
          <>
            <Text style={notesStyle}>{copy.whyReceiving}</Text>
            <Text style={{ ...notesStyle, marginTop: "8px" }}>{copy.ignore}</Text>
          </>
        }
      />
    </EmailWrapper>
  );
}
