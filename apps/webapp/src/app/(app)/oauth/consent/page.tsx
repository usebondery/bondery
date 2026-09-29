import { Suspense } from "react";
import { OAuthConsentClient } from "./OAuthConsentClient";

export default function OAuthConsentPage() {
  return (
    <Suspense>
      <OAuthConsentClient
        chromeExtensionClientId={process.env.BONDERY_PUBLIC_OAUTH_CLIENT_ID ?? ""}
        webappClientId={process.env.BONDERY_PUBLIC_WEBAPP_OAUTH_CLIENT_ID ?? ""}
      />
    </Suspense>
  );
}
