import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getDokploySyncWebhookBranch } from "@bondery/helpers/env";
import {
  buildDeployWebhookPayload,
  buildOpsUploadPayload,
  buildUploadPayload,
  formatEnvPayload,
  mergeComposeEnv,
  mergeOpsEnv,
  quoteEnvValue,
  readDokployConfig,
} from "./sync-infisical-to-dokploy.mjs";

describe("sync-infisical-to-dokploy", () => {
  const websiteEnv = {
    BONDERY_INFRA_API_DOMAIN: "api.usebondery.com",
    BONDERY_INFRA_PLAUSIBLE_DOMAIN: "plausible.usebondery.com",
    BONDERY_INFRA_WEBAPP_DOMAIN: "app.usebondery.com",
    BONDERY_INFRA_WEBSITE_DOMAIN: "usebondery.com",
    BONDERY_OPS_DOKPLOY_API_KEY: "test-api-key",
    BONDERY_OPS_DOKPLOY_HOST: "https://dokploy.example.com",
    BONDERY_OPS_DOKPLOY_OPS_COMPOSE_ID: "website-compose-id",
  };

  const plausibleEnv = {
    BONDERY_INFRA_PLAUSIBLE_DISABLE_REGISTRATION: "invite_only",
    BONDERY_INFRA_PLAUSIBLE_DOMAIN: "plausible.usebondery.com",
    BONDERY_OPS_DOKPLOY_API_KEY: "test-api-key",
    BONDERY_OPS_DOKPLOY_HOST: "https://dokploy.example.com",
    BONDERY_OPS_DOKPLOY_PLAUSIBLE_COMPOSE_ID: "plausible-compose-id",
    BONDERY_PRIVATE_PLAUSIBLE_POSTGRES_PASSWORD: "postgres-secret",
    BONDERY_PRIVATE_PLAUSIBLE_SECRET_KEY_BASE: "secret-key-base",
    BONDERY_PRIVATE_PLAUSIBLE_TOTP_VAULT_KEY: "totp-vault-key",
  };

  const servicesEnv = {
    BONDERY_INFRA_API_DOMAIN: "api.usebondery.com",
    BONDERY_INFRA_CHROME_EXTENSION_ID: "lpcmokfekjjejnpobhbkgmjkodfhpmha",
    BONDERY_INFRA_GIT_SHA: "abc123",
    BONDERY_INFRA_STORAGE_DOMAIN: "storage.usebondery.com",
    BONDERY_INFRA_TRAEFIK_PREFIX: "bondery-beta",
    BONDERY_INFRA_VERSION: "1.8.3",
    BONDERY_INFRA_WEBAPP_DOMAIN: "app.usebondery.com",
    BONDERY_INFRA_WEBSITE_DOMAIN: "usebondery.com",
    BONDERY_OPS_DOKPLOY_API_KEY: "test-api-key",
    BONDERY_OPS_DOKPLOY_HOST: "https://dokploy.example.com",
    BONDERY_OPS_DOKPLOY_SERVICES_COMPOSE_ID: "services-compose-id",
    BONDERY_PRIVATE_AUTH_GITHUB_CLIENT_ID: "",
    BONDERY_PRIVATE_AUTH_GITHUB_CLIENT_SECRET: "",
    BONDERY_PRIVATE_AUTH_LINKEDIN_CLIENT_ID: "",
    BONDERY_PRIVATE_AUTH_LINKEDIN_CLIENT_SECRET: "",
    BONDERY_PRIVATE_BETTER_AUTH_SECRETS: "1:better-auth-secret-min-32-chars-long",
    BONDERY_PRIVATE_EMAIL_ADDRESS: "robot@usebondery.com",
    BONDERY_PRIVATE_EMAIL_HOST: "smtp.example.com",
    BONDERY_PRIVATE_EMAIL_PASS: "email-pass",
    BONDERY_PRIVATE_EMAIL_PORT: "587",
    BONDERY_PRIVATE_EMAIL_REPLY_TO: "team@usebondery.com",
    BONDERY_PRIVATE_EMAIL_USER: "username",
    BONDERY_PRIVATE_POSTGRES_PASSWORD: "postgres-secret",
    BONDERY_PRIVATE_REDIS_URL: "redis://redis:6379",
    BONDERY_PRIVATE_S3_ACCESS_KEY_ID: "bondery_access_key",
    BONDERY_PRIVATE_S3_ENDPOINT: "http://seaweedfs-s3:8333",
    BONDERY_PRIVATE_S3_REGION: "eu-central-1",
    BONDERY_PRIVATE_S3_SECRET_ACCESS_KEY: "bondery_secret_key",
    BONDERY_PRIVATE_SERVICE_SECRET: "service-secret-min-32-chars-long",
    BONDERY_PRIVATE_STRIPE_SECRET_KEY: "sk_live_test",
    BONDERY_PRIVATE_STRIPE_WEBHOOK_SECRET: "whsec_test",
    BONDERY_PRIVATE_WEBAPP_OAUTH_CLIENT_SECRET: "webapp-oauth-secret-min-32-chars",
    BONDERY_PRIVATE_WEBAPP_SESSION_SECRET: "webapp-session-secret-min-32-chars",
    BONDERY_PUBLIC_BILLING_UPGRADES_ENABLED: "false",
    BONDERY_PUBLIC_OAUTH_CLIENT_ID: "chrome-oauth-client",
    BONDERY_PUBLIC_POSTHOG_HOST: "https://eu.i.posthog.com",
    BONDERY_PUBLIC_POSTHOG_KEY: "phc_test",
    BONDERY_PUBLIC_STORAGE_URL: "https://storage.usebondery.com",
    BONDERY_PUBLIC_STRIPE_PRICE_ID_ANNUAL: "price_annual",
    BONDERY_PUBLIC_STRIPE_PRICE_ID_MONTHLY: "price_monthly",
    BONDERY_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_test",
    BONDERY_PUBLIC_WEBAPP_OAUTH_CLIENT_ID: "webapp-oauth-client-id",
  };

  it("website payload excludes Dokploy config keys and plausible secrets", () => {
    const env = {
      ...websiteEnv,
      BONDERY_OPS_DOKPLOY_WEBSITE_DEPLOY_WEBHOOK: "https://dokploy.example.com/hook",
      BONDERY_PRIVATE_PLAUSIBLE_SECRET_KEY_BASE: "should-not-upload",
    };

    const { uploadKeys } = buildUploadPayload(env, "website");

    assert.deepEqual(uploadKeys, [
      "BONDERY_INFRA_API_DOMAIN",
      "BONDERY_INFRA_PLAUSIBLE_DOMAIN",
      "BONDERY_INFRA_WEBAPP_DOMAIN",
      "BONDERY_INFRA_WEBSITE_DOMAIN",
    ]);
    assert.equal(uploadKeys.includes("BONDERY_OPS_DOKPLOY_API_KEY"), false);
    assert.equal(uploadKeys.includes("BONDERY_PRIVATE_PLAUSIBLE_SECRET_KEY_BASE"), false);
    assert.equal(uploadKeys.includes("BONDERY_INFRA_TRAEFIK_PREFIX"), false);
  });

  it("website payload includes TRAEFIK_PREFIX when set", () => {
    const env = {
      ...websiteEnv,
      BONDERY_INFRA_TRAEFIK_PREFIX: "bondery-beta",
    };

    const { uploadKeys } = buildUploadPayload(env, "website");

    assert.deepEqual(uploadKeys, [
      "BONDERY_INFRA_API_DOMAIN",
      "BONDERY_INFRA_PLAUSIBLE_DOMAIN",
      "BONDERY_INFRA_TRAEFIK_PREFIX",
      "BONDERY_INFRA_WEBAPP_DOMAIN",
      "BONDERY_INFRA_WEBSITE_DOMAIN",
    ]);
  });

  it("website payload includes IMAGE_TAG when set", () => {
    const env = {
      ...websiteEnv,
      BONDERY_INFRA_WEBSITE_IMAGE_TAG: "production",
    };

    const { uploadKeys } = buildUploadPayload(env, "website");

    assert.deepEqual(uploadKeys, [
      "BONDERY_INFRA_API_DOMAIN",
      "BONDERY_INFRA_PLAUSIBLE_DOMAIN",
      "BONDERY_INFRA_WEBAPP_DOMAIN",
      "BONDERY_INFRA_WEBSITE_DOMAIN",
      "BONDERY_INFRA_WEBSITE_IMAGE_TAG",
    ]);
  });

  it("plausible payload includes plausible secrets only", () => {
    const { uploadKeys } = buildUploadPayload(plausibleEnv, "plausible");

    assert.deepEqual(uploadKeys, [
      "BONDERY_INFRA_PLAUSIBLE_DISABLE_REGISTRATION",
      "BONDERY_INFRA_PLAUSIBLE_DOMAIN",
      "BONDERY_PRIVATE_PLAUSIBLE_POSTGRES_PASSWORD",
      "BONDERY_PRIVATE_PLAUSIBLE_SECRET_KEY_BASE",
      "BONDERY_PRIVATE_PLAUSIBLE_TOTP_VAULT_KEY",
    ]);
    assert.equal(uploadKeys.includes("BONDERY_INFRA_WEBAPP_DOMAIN"), false);
    assert.equal(uploadKeys.includes("BONDERY_INFRA_WEBSITE_DOMAIN"), false);
  });

  it("services payload includes deployExample keys and excludes derived or ops config", () => {
    const { uploadKeys } = buildUploadPayload(servicesEnv, "services");

    assert.equal(uploadKeys.includes("BONDERY_OPS_DOKPLOY_API_KEY"), false);
    assert.equal(uploadKeys.includes("BONDERY_OPS_DOKPLOY_SERVICES_COMPOSE_ID"), false);
    assert.equal(uploadKeys.includes("BONDERY_OPS_DOKPLOY_STAGING_SERVICES_COMPOSE_ID"), false);
    assert.equal(uploadKeys.includes("BONDERY_OPS_DOKPLOY_STAGING_SERVICES_DEPLOY_WEBHOOK"), false);
    assert.equal(uploadKeys.includes("BONDERY_INFRA_GIT_SHA"), false);
    assert.ok(uploadKeys.includes("BONDERY_INFRA_TRAEFIK_PREFIX"));
    assert.equal(uploadKeys.includes("BONDERY_INFRA_VERSION"), false);
    assert.equal(uploadKeys.includes("BONDERY_PRIVATE_S3_ENDPOINT"), false);
    assert.equal(uploadKeys.includes("BONDERY_PUBLIC_STORAGE_URL"), false);
    assert.ok(uploadKeys.includes("BONDERY_INFRA_API_DOMAIN"));
    assert.ok(uploadKeys.includes("BONDERY_PRIVATE_POSTGRES_PASSWORD"));
    assert.ok(uploadKeys.includes("BONDERY_PUBLIC_POSTHOG_KEY"));
    assert.ok(uploadKeys.includes("BONDERY_INFRA_STORAGE_DOMAIN"));
  });

  it("services sync fails when postgres password is missing", () => {
    const env = { ...servicesEnv };
    delete env.BONDERY_PRIVATE_POSTGRES_PASSWORD;

    let exited = false;
    const originalExit = process.exit;
    process.exit = (code) => {
      exited = true;
      assert.equal(code, 1);
      throw new Error("exit");
    };

    try {
      buildUploadPayload(env, "services");
      assert.fail("expected process.exit(1)");
    } catch {
      // expected
    }

    process.exit = originalExit;
    assert.equal(exited, true);
  });

  it("readDokployConfig resolves services compose id", () => {
    const config = readDokployConfig(servicesEnv, "services");
    assert.equal(config.composeId, "services-compose-id");
    assert.equal(config.webhookKey, "BONDERY_OPS_DOKPLOY_SERVICES_DEPLOY_WEBHOOK");
    assert.equal(config.target, "services");
  });

  it("readDokployConfig resolves services-beta staging compose id", () => {
    const env = {
      ...servicesEnv,
      BONDERY_OPS_DOKPLOY_STAGING_SERVICES_COMPOSE_ID: "beta-services-compose-id",
      BONDERY_OPS_DOKPLOY_STAGING_SERVICES_DEPLOY_WEBHOOK: "https://dokploy.example.com/beta-hook",
    };
    delete env.BONDERY_OPS_DOKPLOY_SERVICES_COMPOSE_ID;

    const config = readDokployConfig(env, "services-beta");
    assert.equal(config.composeId, "beta-services-compose-id");
    assert.equal(config.webhookKey, "BONDERY_OPS_DOKPLOY_STAGING_SERVICES_DEPLOY_WEBHOOK");
    assert.equal(config.target, "services-beta");
  });

  it("services-beta upload payload matches services keys", () => {
    const { uploadKeys: servicesKeys } = buildUploadPayload(servicesEnv, "services");
    const { uploadKeys: betaKeys } = buildUploadPayload(servicesEnv, "services-beta");
    assert.deepEqual(betaKeys, servicesKeys);
  });

  it("buildDeployWebhookPayload uses main ref for services-beta redeploy", () => {
    const payload = buildDeployWebhookPayload("usebondery/bondery", ["deploy/bondery"], "main");
    assert.equal(payload.ref, "refs/heads/main");
  });

  it("readDokployConfig resolves website-beta staging compose id", () => {
    const env = {
      ...websiteEnv,
      BONDERY_OPS_DOKPLOY_STAGING_WEBSITE_COMPOSE_ID: "beta-website-compose-id",
      BONDERY_OPS_DOKPLOY_STAGING_WEBSITE_DEPLOY_WEBHOOK:
        "https://dokploy.example.com/beta-website-hook",
    };
    delete env.BONDERY_OPS_DOKPLOY_OPS_COMPOSE_ID;

    const config = readDokployConfig(env, "website-beta");
    assert.equal(config.composeId, "beta-website-compose-id");
    assert.equal(config.webhookKey, "BONDERY_OPS_DOKPLOY_STAGING_WEBSITE_DEPLOY_WEBHOOK");
    assert.equal(config.target, "website-beta");
  });

  it("website-beta upload payload matches website keys including image tag when set", () => {
    const betaEnv = {
      ...websiteEnv,
      BONDERY_INFRA_TRAEFIK_PREFIX: "bondery-beta",
      BONDERY_INFRA_WEBSITE_IMAGE_TAG: "beta",
    };
    const { uploadKeys: betaKeys } = buildUploadPayload(betaEnv, "website-beta");
    const { uploadKeys: websiteKeys } = buildUploadPayload(betaEnv, "website");

    assert.deepEqual(betaKeys, websiteKeys);
    assert.ok(betaKeys.includes("BONDERY_INFRA_WEBSITE_IMAGE_TAG"));
  });

  it("getDokploySyncWebhookBranch uses main for website-beta", () => {
    assert.equal(getDokploySyncWebhookBranch("website-beta"), "main");
  });

  it("buildOpsUploadPayload remains an alias for website target", () => {
    const { uploadKeys } = buildOpsUploadPayload(websiteEnv);
    assert.deepEqual(uploadKeys, [
      "BONDERY_INFRA_API_DOMAIN",
      "BONDERY_INFRA_PLAUSIBLE_DOMAIN",
      "BONDERY_INFRA_WEBAPP_DOMAIN",
      "BONDERY_INFRA_WEBSITE_DOMAIN",
    ]);
  });

  for (const missingKey of [
    "BONDERY_INFRA_API_DOMAIN",
    "BONDERY_INFRA_WEBAPP_DOMAIN",
    "BONDERY_INFRA_WEBSITE_DOMAIN",
    "BONDERY_INFRA_PLAUSIBLE_DOMAIN",
  ]) {
    it(`website sync fails when required key ${missingKey} is missing`, () => {
      const env = { ...websiteEnv };
      delete env[missingKey];

      let exited = false;
      const originalExit = process.exit;
      process.exit = (code) => {
        exited = true;
        assert.equal(code, 1);
        throw new Error("exit");
      };

      try {
        buildUploadPayload(env, "website");
        assert.fail("expected process.exit(1)");
      } catch {
        // expected from mocked process.exit
      }

      process.exit = originalExit;
      assert.equal(exited, true);
    });
  }

  it("plausible sync fails when a required secret is missing", () => {
    const env = { ...plausibleEnv };
    delete env.BONDERY_PRIVATE_PLAUSIBLE_SECRET_KEY_BASE;

    let exited = false;
    const originalExit = process.exit;
    process.exit = (code) => {
      exited = true;
      assert.equal(code, 1);
      throw new Error("exit");
    };

    try {
      buildUploadPayload(env, "plausible");
      assert.fail("expected process.exit(1)");
    } catch {
      // expected
    }

    process.exit = originalExit;
    assert.equal(exited, true);
  });

  it("readDokployConfig resolves website compose id", () => {
    const config = readDokployConfig(websiteEnv, "website");
    assert.equal(config.composeId, "website-compose-id");
    assert.equal(config.target, "website");
  });

  it("readDokployConfig resolves plausible compose id", () => {
    const config = readDokployConfig(plausibleEnv, "plausible");
    assert.equal(config.composeId, "plausible-compose-id");
    assert.equal(config.webhookKey, "BONDERY_OPS_DOKPLOY_PLAUSIBLE_DEPLOY_WEBHOOK");
  });

  it("readDokployConfig fails when API key is missing", () => {
    const env = { ...websiteEnv };
    delete env.BONDERY_OPS_DOKPLOY_API_KEY;

    let exited = false;
    const originalExit = process.exit;
    process.exit = (code) => {
      exited = true;
      assert.equal(code, 1);
      throw new Error("exit");
    };

    try {
      readDokployConfig(env, "website");
    } catch {
      // expected
    }

    process.exit = originalExit;
    assert.equal(exited, true);
  });

  it("mergeComposeEnv preserves unsynced keys", () => {
    const existing = "BONDERY_INFRA_VERSION=1.8.2\nBONDERY_INFRA_WEBAPP_DOMAIN=old.example.com";
    const rows = [{ key: "BONDERY_INFRA_WEBAPP_DOMAIN", value: "app.usebondery.com" }];

    const merged = mergeComposeEnv(existing, rows, quoteEnvValue);

    assert.match(merged, /BONDERY_INFRA_VERSION=1\.8\.2/);
    assert.match(merged, /BONDERY_INFRA_WEBAPP_DOMAIN=app\.usebondery\.com/);
  });

  it("mergeOpsEnv remains an alias for mergeComposeEnv", () => {
    const existing = "BONDERY_INFRA_VERSION=1.8.2";
    const rows = [{ key: "BONDERY_INFRA_WEBAPP_DOMAIN", value: "app.usebondery.com" }];
    assert.equal(
      mergeOpsEnv(existing, rows, quoteEnvValue),
      mergeComposeEnv(existing, rows, quoteEnvValue),
    );
  });

  it("formatEnvPayload quotes values with special characters", () => {
    const payload = formatEnvPayload(
      [{ key: "BONDERY_INFRA_GIT_SHA", value: "abc def" }],
      quoteEnvValue,
    );

    assert.equal(payload, 'BONDERY_INFRA_GIT_SHA="abc def"');
  });

  it("buildDeployWebhookPayload includes path sentinels for Dokploy watch paths", () => {
    const plausiblePayload = buildDeployWebhookPayload("usebondery/bondery", ["deploy/plausible"]);
    assert.equal(plausiblePayload.ref, "refs/heads/release");
    assert.equal(plausiblePayload.repository.full_name, "usebondery/bondery");
    assert.deepEqual(plausiblePayload.commits[0].modified, ["deploy/plausible"]);

    const servicesPayload = buildDeployWebhookPayload("usebondery/bondery", ["deploy/bondery"]);
    assert.deepEqual(servicesPayload.commits[0].modified, ["deploy/bondery"]);
  });
});
