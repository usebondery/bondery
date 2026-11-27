/**
 * Why a DAV XML body was refused.
 *
 * - `body_too_large`: the body is over the size cap. Route answers 413.
 * - `forbidden_construct`: the body has a DOCTYPE or ENTITY declaration. Route answers 400.
 * - `malformed_xml`: the body is not well-formed XML. Route answers 400.
 * - `invalid_request`: the XML is well-formed but is not a valid request of its kind. Route answers 400.
 * - `unsupported_report`: the REPORT root element is not one we serve. Route answers 403 with the
 *   `supported-report` precondition.
 */
export type DavXmlErrorCode =
  | "body_too_large"
  | "forbidden_construct"
  | "malformed_xml"
  | "invalid_request"
  | "unsupported_report";

/**
 * Typed failure of the XML layer. The message is safe to log and never repeats input text, so a
 * route can also return it to the client.
 */
export class DavXmlError extends Error {
  readonly code: DavXmlErrorCode;

  constructor(code: DavXmlErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "DavXmlError";
    this.code = code;
  }
}
