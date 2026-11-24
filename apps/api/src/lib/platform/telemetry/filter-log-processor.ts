import { type Context, SeverityNumber } from "@opentelemetry/api";
import type { LogRecordProcessor, ReadWriteLogRecord } from "@opentelemetry/sdk-logs";
import { isSensitiveKey, REDACTED, redactSensitive, scrubEmails } from "./redact.js";

/**
 * Sits in front of the exporting processor. Drops records below `minimumSeverity` and
 * redacts the rest, so only warnings and errors are shipped, without contact details.
 */
export class FilteringLogRecordProcessor implements LogRecordProcessor {
  private readonly next: LogRecordProcessor;
  private readonly minimumSeverity: SeverityNumber;

  constructor(next: LogRecordProcessor, minimumSeverity: SeverityNumber = SeverityNumber.WARN) {
    this.next = next;
    this.minimumSeverity = minimumSeverity;
  }

  onEmit(logRecord: ReadWriteLogRecord, context?: Context): void {
    if ((logRecord.severityNumber ?? SeverityNumber.UNSPECIFIED) < this.minimumSeverity) {
      return;
    }

    if (typeof logRecord.body === "string") {
      logRecord.body = scrubEmails(logRecord.body);
    }

    for (const [key, value] of Object.entries(logRecord.attributes)) {
      if (isSensitiveKey(key)) {
        logRecord.setAttribute(key, REDACTED);
      } else if (typeof value === "string" || (value !== null && typeof value === "object")) {
        logRecord.setAttribute(key, redactSensitive(value) as typeof value);
      }
    }

    this.next.onEmit(logRecord, context);
  }

  forceFlush(): Promise<void> {
    return this.next.forceFlush();
  }

  shutdown(): Promise<void> {
    return this.next.shutdown();
  }
}
