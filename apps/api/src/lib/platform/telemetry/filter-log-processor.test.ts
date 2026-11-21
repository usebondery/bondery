import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SeverityNumber } from "@opentelemetry/api";
import {
  InMemoryLogRecordExporter,
  LoggerProvider,
  SimpleLogRecordProcessor,
} from "@opentelemetry/sdk-logs";
import { FilteringLogRecordProcessor } from "./filter-log-processor.js";
import { redactSensitive, scrubEmails } from "./redact.js";

function createLogger() {
  const exporter = new InMemoryLogRecordExporter();
  const provider = new LoggerProvider({
    processors: [new FilteringLogRecordProcessor(new SimpleLogRecordProcessor({ exporter }))],
  });
  return { exporter, logger: provider.getLogger("test") };
}

describe("scrubEmails", () => {
  it("replaces every email address inside free text", () => {
    assert.equal(
      scrubEmails("550 mailbox ada.lovelace+work@mail.example.co.uk unavailable, cc a@b.io"),
      "550 mailbox [redacted-email] unavailable, cc [redacted-email]",
    );
  });

  it("leaves text without an address unchanged", () => {
    assert.equal(scrubEmails("user@ not an address, id 42"), "user@ not an address, id 42");
  });
});

describe("redactSensitive", () => {
  it("replaces sensitive keys at any depth, in any letter case, and keeps the rest", () => {
    const input = {
      headers: { Authorization: "Bearer abc", "user-agent": "curl" },
      list: [{ email: "a@example.com", id: 1 }],
      note: "sent to a@example.com",
      userId: "user-1",
    };

    assert.deepEqual(redactSensitive(input), {
      headers: { Authorization: "[redacted]", "user-agent": "curl" },
      list: [{ email: "[redacted]", id: 1 }],
      note: "sent to [redacted-email]",
      userId: "user-1",
    });
    assert.equal(input.headers.Authorization, "Bearer abc", "input must not be mutated");
  });

  it("returns non-string primitives unchanged", () => {
    assert.equal(redactSensitive(null), null);
    assert.equal(redactSensitive(42), 42);
    assert.equal(redactSensitive(true), true);
  });
});

describe("filteringLogRecordProcessor", () => {
  it("drops records below warn and passes warn and error", () => {
    const { exporter, logger } = createLogger();

    logger.emit({ body: "debug", severityNumber: SeverityNumber.DEBUG });
    logger.emit({ body: "info", severityNumber: SeverityNumber.INFO });
    logger.emit({ body: "no severity" });
    logger.emit({ body: "warn", severityNumber: SeverityNumber.WARN });
    logger.emit({ body: "error", severityNumber: SeverityNumber.ERROR });

    assert.deepEqual(
      exporter.getFinishedLogRecords().map((record) => record.body),
      ["warn", "error"],
    );
  });

  it("redacts sensitive attributes and scrubs emails from message text", () => {
    const { exporter, logger } = createLogger();

    logger.emit({
      attributes: {
        email: "a@example.com",
        "exception.message": "550 mailbox a@example.com unavailable",
        req: { headers: { cookie: "session=abc" }, method: "POST" },
        request_id: "req-1",
        userId: "user-1",
      },
      body: "could not email a@example.com",
      severityNumber: SeverityNumber.ERROR,
    });

    const [record] = exporter.getFinishedLogRecords();
    assert.equal(record.body, "could not email [redacted-email]");
    assert.deepEqual(record.attributes, {
      email: "[redacted]",
      "exception.message": "550 mailbox [redacted-email] unavailable",
      req: { headers: { cookie: "[redacted]" }, method: "POST" },
      request_id: "req-1",
      userId: "user-1",
    });
  });
});
