import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { probeSmtp } from "../lib/health/probe-smtp.js";
import {
  classifySmtpError,
  emailTransportOptions,
  getEmailTransporter,
  getEmailTransportReadiness,
  initEmailTransport,
  resetEmailReadinessForTests,
  resetEmailTransporterForTests,
  shutdownEmailTransporter,
  verifyEmailTransport,
} from "../lib/notifications/transporter.js";

const baseConfig = {
  fromAddress: "robot@usebondery.com",
  host: "smtp.example.com",
  pass: "secret",
  replyToAddress: "team@usebondery.com",
  user: "user",
};

type EmailEnvSnapshot = {
  address?: string;
  host?: string;
  nodeEnv?: string;
  pass?: string;
  port?: string;
  replyTo?: string;
  user?: string;
};

function snapshotEmailEnv(): EmailEnvSnapshot {
  return {
    address: process.env.BONDERY_PRIVATE_EMAIL_ADDRESS,
    host: process.env.BONDERY_PRIVATE_EMAIL_HOST,
    nodeEnv: process.env.NODE_ENV,
    pass: process.env.BONDERY_PRIVATE_EMAIL_PASS,
    port: process.env.BONDERY_PRIVATE_EMAIL_PORT,
    replyTo: process.env.BONDERY_PRIVATE_EMAIL_REPLY_TO,
    user: process.env.BONDERY_PRIVATE_EMAIL_USER,
  };
}

function setConfiguredEmailEnv(): void {
  process.env.BONDERY_PRIVATE_EMAIL_HOST = baseConfig.host;
  process.env.BONDERY_PRIVATE_EMAIL_PORT = "587";
  process.env.BONDERY_PRIVATE_EMAIL_USER = baseConfig.user;
  process.env.BONDERY_PRIVATE_EMAIL_PASS = baseConfig.pass;
  process.env.BONDERY_PRIVATE_EMAIL_ADDRESS = baseConfig.fromAddress;
  process.env.BONDERY_PRIVATE_EMAIL_REPLY_TO = baseConfig.replyToAddress;
}

function setLoopbackEmailEnv(): void {
  setConfiguredEmailEnv();
  process.env.BONDERY_PRIVATE_EMAIL_HOST = "127.0.0.1";
  process.env.BONDERY_PRIVATE_EMAIL_PORT = "26640";
}

function clearEmailEnv(): void {
  delete process.env.BONDERY_PRIVATE_EMAIL_HOST;
  delete process.env.BONDERY_PRIVATE_EMAIL_USER;
  delete process.env.BONDERY_PRIVATE_EMAIL_PASS;
  delete process.env.BONDERY_PRIVATE_EMAIL_ADDRESS;
  delete process.env.BONDERY_PRIVATE_EMAIL_REPLY_TO;
  delete process.env.BONDERY_PRIVATE_EMAIL_PORT;
}

function restoreEmailEnv(snapshot: EmailEnvSnapshot): void {
  const restore = (key: keyof EmailEnvSnapshot, envKey: string) => {
    const value = snapshot[key];
    if (value === undefined) {
      delete process.env[envKey];
    } else {
      process.env[envKey] = value;
    }
  };

  restore("host", "BONDERY_PRIVATE_EMAIL_HOST");
  restore("port", "BONDERY_PRIVATE_EMAIL_PORT");
  restore("user", "BONDERY_PRIVATE_EMAIL_USER");
  restore("pass", "BONDERY_PRIVATE_EMAIL_PASS");
  restore("address", "BONDERY_PRIVATE_EMAIL_ADDRESS");
  restore("replyTo", "BONDERY_PRIVATE_EMAIL_REPLY_TO");
  restore("nodeEnv", "NODE_ENV");
}

describe("emailTransportOptions", () => {
  it("uses implicit TLS on port 465", () => {
    const options = emailTransportOptions({ ...baseConfig, port: 465 });

    assert.equal(options.secure, true);
    assert.equal(options.requireTLS, false);
    assert.equal(options.tls.rejectUnauthorized, true);
  });

  it("uses STARTTLS on port 587", () => {
    const options = emailTransportOptions({ ...baseConfig, port: 587 });

    assert.equal(options.secure, false);
    assert.equal(options.requireTLS, true);
    assert.equal(options.ignoreTLS, false);
    assert.equal(options.tls.rejectUnauthorized, true);
  });

  it("disables TLS for loopback host in non-production", () => {
    const options = emailTransportOptions({
      ...baseConfig,
      host: "127.0.0.1",
      port: 26640,
    });

    assert.equal(options.secure, false);
    assert.equal(options.requireTLS, false);
    assert.equal(options.ignoreTLS, true);
    assert.equal(options.port, 26640);
  });

  it("keeps STARTTLS for loopback host in production", () => {
    const snapshot = snapshotEmailEnv();
    process.env.NODE_ENV = "production";
    try {
      const options = emailTransportOptions({
        ...baseConfig,
        host: "127.0.0.1",
        port: 587,
      });

      assert.equal(options.secure, false);
      assert.equal(options.requireTLS, true);
      assert.equal(options.ignoreTLS, false);
    } finally {
      restoreEmailEnv(snapshot);
    }
  });

  it("enables connection pooling with Plunk-safe defaults", () => {
    const options = emailTransportOptions({ ...baseConfig, port: 587 });

    assert.equal(options.pool, true);
    assert.equal(options.maxConnections, 3);
    assert.equal(options.maxMessages, 100);
  });
});

describe("email transporter singleton", () => {
  const snapshot = snapshotEmailEnv();

  afterEach(() => {
    void shutdownEmailTransporter();
    resetEmailReadinessForTests();
    restoreEmailEnv(snapshot);
  });

  it("returns the same transporter instance on repeated getEmailTransporter calls", () => {
    setConfiguredEmailEnv();
    resetEmailTransporterForTests();

    const first = getEmailTransporter();
    const second = getEmailTransporter();

    assert.equal(first, second);
  });
});

describe("email transport readiness", () => {
  const snapshot = snapshotEmailEnv();

  afterEach(() => {
    void shutdownEmailTransporter();
    resetEmailReadinessForTests();
    restoreEmailEnv(snapshot);
  });

  it("initEmailTransport skips verify when SMTP is unconfigured in test", async () => {
    process.env.NODE_ENV = "test";
    clearEmailEnv();
    resetEmailTransporterForTests();

    const readiness = await initEmailTransport();

    assert.equal(readiness.configured, false);
    assert.equal(readiness.ok, true);
    assert.equal(getEmailTransportReadiness().configured, false);
  });

  it("initEmailTransport throws when SMTP is unconfigured in development", async () => {
    process.env.NODE_ENV = "development";
    clearEmailEnv();
    resetEmailTransporterForTests();

    await assert.rejects(() => initEmailTransport(), /BONDERY_PRIVATE_EMAIL_\* must be set/);
  });

  it("initEmailTransport skips live verify in test environment", async () => {
    process.env.NODE_ENV = "test";
    setConfiguredEmailEnv();
    resetEmailTransporterForTests();

    const readiness = await initEmailTransport();

    assert.equal(readiness.configured, true);
    assert.equal(readiness.ok, true);
  });

  it("verifyEmailTransport classifies auth failures", async () => {
    process.env.NODE_ENV = "development";
    setConfiguredEmailEnv();
    resetEmailTransporterForTests();

    const current = getEmailTransporter();
    current.verify = async () => {
      const error = new Error("Invalid login: 535 authentication failed") as Error & {
        code?: string;
      };
      error.code = "EAUTH";
      throw error;
    };

    const readiness = await verifyEmailTransport();

    assert.equal(readiness.configured, true);
    assert.equal(readiness.ok, false);
    assert.equal(readiness.error, "auth_failed");
  });

  it("classifySmtpError maps timeout and auth without leaking details", () => {
    const timeout = new Error("SMTP verify timed out");
    timeout.name = "AbortError";
    assert.equal(classifySmtpError(timeout), "timeout");

    const auth = new Error("Invalid login") as Error & { code?: string };
    auth.code = "EAUTH";
    assert.equal(classifySmtpError(auth), "auth_failed");
  });

  it("verifyEmailTransport reuses recent boot verification for readiness probes", async () => {
    process.env.NODE_ENV = "development";
    setLoopbackEmailEnv();
    resetEmailTransporterForTests();

    let verifyCalls = 0;
    const current = getEmailTransporter();
    current.verify = async () => {
      verifyCalls += 1;
    };

    await initEmailTransport();
    const readiness = await verifyEmailTransport();

    assert.equal(readiness.ok, true);
    assert.equal(verifyCalls, 1);
  });

  it("initEmailTransport throws when verify fails outside test", async () => {
    process.env.NODE_ENV = "development";
    setLoopbackEmailEnv();
    resetEmailTransporterForTests();

    const current = getEmailTransporter();
    current.verify = async () => {
      throw new Error("connection refused");
    };

    await assert.rejects(() => initEmailTransport(), /SMTP verify failed/);
  });

  it("initEmailTransport throws in development when SMTP host is not loopback", async () => {
    process.env.NODE_ENV = "development";
    setConfiguredEmailEnv();
    resetEmailTransporterForTests();

    await assert.rejects(() => initEmailTransport(), /pnpm run start:mailpit/);
  });

  it("initEmailTransport does not require loopback in production", async () => {
    process.env.NODE_ENV = "production";
    setConfiguredEmailEnv();
    resetEmailTransporterForTests();

    const current = getEmailTransporter();
    current.verify = async () => undefined;

    const readiness = await initEmailTransport();

    assert.equal(readiness.configured, true);
    assert.equal(readiness.ok, true);
  });
});

describe("probeSmtp", () => {
  const snapshot = snapshotEmailEnv();

  afterEach(() => {
    void shutdownEmailTransporter();
    resetEmailReadinessForTests();
    restoreEmailEnv(snapshot);
  });

  it("returns unconfigured ok in test when SMTP env is missing", async () => {
    process.env.NODE_ENV = "test";
    clearEmailEnv();
    resetEmailTransporterForTests();

    const result = await probeSmtp();

    assert.deepEqual(result, { configured: false, ok: true });
  });

  it("returns unhealthy when SMTP env is missing outside test", async () => {
    process.env.NODE_ENV = "development";
    clearEmailEnv();
    resetEmailTransporterForTests();

    const result = await probeSmtp();

    assert.deepEqual(result, {
      configured: false,
      error: "not_configured",
      ok: false,
    });
  });

  it("returns ok when configured in test environment", async () => {
    process.env.NODE_ENV = "test";
    setConfiguredEmailEnv();
    resetEmailTransporterForTests();

    const result = await probeSmtp();

    assert.equal(result.configured, true);
    assert.equal(result.ok, true);
  });
});
