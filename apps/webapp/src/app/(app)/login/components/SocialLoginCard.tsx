"use client";

import { getAuthUserFacingError } from "@bondery/helpers/api";
import { isEmailSignInEnabled } from "@bondery/helpers/auth/oauth-providers";
import { WEBSITE_ROUTES } from "@bondery/helpers/globals/paths";
import {
  AnchorLink,
  CornerLabeledButton,
  errorNotificationTemplate,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { loginEmailFormSchema } from "@bondery/schemas";
import type { OAuthProviderId, OAuthProvidersBitmap } from "@bondery/schemas/oauth-providers";
import { Button, Stack, Text, TextInput, Title, Tooltip } from "@mantine/core";
import { schemaResolver, useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconMail, IconMailForward } from "@tabler/icons-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { WebappAuthClient } from "@/lib/auth/client";
import { isLastUsedMagicLink } from "@/lib/auth/last-login-method";
import { stripTransientAuthErrorFromLocation } from "@/lib/auth/magic-link-urls";
import { isWebAuthnSupported } from "@/lib/auth/passkey-support";
import { useCommonTranslations, useLoginPageTranslations } from "@/lib/i18n/generated/hooks";
import { TypedTrans } from "@/lib/i18n/TypedTrans";
import { LoginBrandShell } from "./LoginBrandShell";
import { type LoginBusyAction, LoginProviderButtons } from "./LoginProviderButtons";
import classes from "./SocialLoginCard.module.css";

export type { LoginBusyAction };

const SESSION_POLL_MS = 4_000;
const RESEND_SECONDS = 30;

export type LoginSurface = "oauth" | "webapp";

type SocialLoginCardProps = {
  authClient: WebappAuthClient;
  busyAction: LoginBusyAction;
  continueUrl: string;
  getPasskeyTestId?: string;
  getProviderTestId?: (providerKey: string) => string | undefined;
  lastUsedLoginMethod: string | null;
  oauthProviders: OAuthProvidersBitmap | null;
  onEmailSubmit: (email: string) => Promise<boolean>;
  onPasskeyClick: () => void;
  onProviderClick: (provider: OAuthProviderId) => void;
  surface: LoginSurface;
  websiteUrl: string;
};

export function SocialLoginCard({
  authClient,
  busyAction,
  continueUrl,
  getPasskeyTestId,
  getProviderTestId,
  lastUsedLoginMethod,
  oauthProviders,
  onEmailSubmit,
  onPasskeyClick,
  onProviderClick,
  surface,
  websiteUrl,
}: SocialLoginCardProps) {
  const t = useLoginPageTranslations();
  const tCommon = useCommonTranslations();
  const searchParams = useSearchParams();
  const queryError = searchParams.get("error");
  const [passkeySupported, setPasskeySupported] = useState(true);
  const [emailPanelOpen, setEmailPanelOpen] = useState(false);
  const [awaitingVerify, setAwaitingVerify] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const shownQueryErrorRef = useRef<string | null>(null);
  const form = useForm({
    initialValues: { email: "" },
    mode: "controlled",
    validate: schemaResolver(loginEmailFormSchema, { sync: true }),
    validateInputOnBlur: true,
  });
  const emailValid = loginEmailFormSchema.safeParse(form.values).success;
  const isBusy = busyAction !== null;
  const isEmailBusy = busyAction === "email";
  const emailSignInEnabled = isEmailSignInEnabled(oauthProviders);
  const showProviders = !emailPanelOpen;
  const magicLinkIsLastUsed = isLastUsedMagicLink(lastUsedLoginMethod);

  useEffect(() => {
    setPasskeySupported(isWebAuthnSupported());
  }, []);

  useEffect(() => {
    if (!queryError || shownQueryErrorRef.current === queryError) {
      return;
    }

    shownQueryErrorRef.current = queryError;
    notifications.show({
      id: `login-query-error-${queryError}`,
      ...errorNotificationTemplate({
        description: getAuthUserFacingError({ code: queryError }, tCommon),
        title: t("AuthenticationError"),
      }),
    });
    stripTransientAuthErrorFromLocation();
  }, [queryError, t, tCommon]);

  useEffect(() => {
    if (resendSeconds <= 0) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setResendSeconds((current) => Math.max(0, current - 1));
    }, 1_000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [resendSeconds]);

  useEffect(() => {
    if (!awaitingVerify) {
      return;
    }

    const poll = window.setInterval(() => {
      void authClient.getSession().then(({ data }) => {
        if (data?.session) {
          window.location.assign(continueUrl);
        }
      });
    }, SESSION_POLL_MS);

    return () => {
      window.clearInterval(poll);
    };
  }, [authClient, awaitingVerify, continueUrl]);

  const submitEmail = async () => {
    const parsed = loginEmailFormSchema.safeParse(form.values);
    if (!parsed.success || isBusy) {
      form.validate();
      return;
    }

    const sent = await onEmailSubmit(parsed.data.email);
    if (!sent) {
      return;
    }

    const sentEmail = parsed.data.email;
    stripTransientAuthErrorFromLocation();
    form.reset();
    setAwaitingVerify(true);
    setResendSeconds(RESEND_SECONDS);
    const sentDescription = t("CheckYourEmailBody", { email: sentEmail });
    notifications.show({
      id: "login-magic-link-sent",
      ...successNotificationTemplate({
        description:
          surface === "oauth"
            ? `${sentDescription} ${t("OpenLinkOnThisDeviceOauth")}`
            : sentDescription,
        title: t("CheckYourEmail"),
      }),
    });
  };

  const closeEmailPanel = () => {
    setEmailPanelOpen(false);
  };

  const continueWithEmailButton = (
    <CornerLabeledButton
      className={classes.filledButton}
      color="branding-primary"
      cornerLabel={magicLinkIsLastUsed ? t("LastUsed") : undefined}
      cornerLabelTestId="login-last-used-badge"
      data-testid="login-email-submit"
      disabled={!emailSignInEnabled || (isBusy && !isEmailBusy)}
      fullWidth
      leftSection={<IconMail size={20} />}
      loading={isEmailBusy}
      onClick={() => {
        if (!emailSignInEnabled) {
          return;
        }
        setEmailPanelOpen(true);
      }}
      size="lg"
      type="button"
      variant="filled"
    >
      {t("ContinueWithEmail")}
    </CornerLabeledButton>
  );

  const continueWithEmailControl = emailSignInEnabled ? (
    continueWithEmailButton
  ) : (
    <Tooltip label={t("EmailSignInUnavailable")}>
      <span style={{ display: "block", width: "100%" }}>{continueWithEmailButton}</span>
    </Tooltip>
  );

  return (
    <LoginBrandShell websiteUrl={websiteUrl}>
      <Stack gap="lg">
        <Stack gap={6}>
          <Title fw={700} fz="h2" lh={1.15} order={2}>
            {t("FormTitle")}
          </Title>
          <Text c="dimmed" size="md">
            {t("Description")}
          </Text>
        </Stack>

        {showProviders ? (
          <Stack gap="xs" w="100%">
            <LoginProviderButtons
              busyAction={busyAction}
              getPasskeyTestId={getPasskeyTestId}
              getProviderTestId={getProviderTestId}
              lastUsedLoginMethod={lastUsedLoginMethod}
              oauthProviders={oauthProviders}
              onPasskeyClick={onPasskeyClick}
              onProviderClick={onProviderClick}
              showOAuth
              showPasskey={passkeySupported}
            />
            {continueWithEmailControl}
          </Stack>
        ) : null}

        {emailPanelOpen ? (
          <form
            onSubmit={form.onSubmit(() => {
              void submitEmail();
            })}
          >
            <Stack gap="sm">
              <TextInput
                {...form.getInputProps("email")}
                autoComplete="email"
                autoFocus
                data-testid="login-email"
                disabled={isBusy}
                label={t("EmailLabel")}
                placeholder={t("EmailPlaceholder")}
                size="md"
                type="email"
              />
              <CornerLabeledButton
                className={classes.filledButton}
                color="branding-primary"
                data-testid={awaitingVerify ? "login-email-resend" : "login-email-send"}
                disabled={
                  !emailSignInEnabled ||
                  !emailValid ||
                  resendSeconds > 0 ||
                  (isBusy && !isEmailBusy)
                }
                fullWidth
                leftSection={<IconMailForward size={20} />}
                loading={isEmailBusy}
                size="lg"
                type="submit"
                variant="filled"
              >
                {resendSeconds > 0
                  ? t("ResendInSeconds", { seconds: resendSeconds })
                  : awaitingVerify
                    ? t("ResendSignInLink")
                    : t("SendLoginLink")}
              </CornerLabeledButton>
              <Button
                data-testid="login-email-back"
                disabled={isBusy}
                fullWidth
                onClick={closeEmailPanel}
                size="md"
                type="button"
                variant="subtle"
              >
                {tCommon("actions.back")}
              </Button>
            </Stack>
          </form>
        ) : null}

        <Text c="dimmed" size="xs">
          <TypedTrans
            components={{
              privacyLink: (
                <AnchorLink href={`${websiteUrl}${WEBSITE_ROUTES.PRIVACY}`} size="xs">
                  {null}
                </AnchorLink>
              ),
              termsLink: (
                <AnchorLink href={`${websiteUrl}${WEBSITE_ROUTES.TERMS}`} size="xs">
                  {null}
                </AnchorLink>
              ),
            }}
            i18nKey="TermsText"
            t={t}
          />
        </Text>
      </Stack>
    </LoginBrandShell>
  );
}
