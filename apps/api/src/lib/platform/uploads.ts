import type { FastifyRequest } from "fastify";
import { DomainError } from "../../domains/_shared/context.js";
import { badRequest } from "./errors/http-errors.js";

export interface UploadedFile {
  buffer: Buffer;
  filename: string;
  mimetype: string;
}

interface ReadUploadedFileOptions {
  /** When set, a file with any other MIME type is refused before its body is read. */
  allowedMimeTypes?: readonly string[];
  /** Hard cap on the file body. Enforced while the body streams. */
  maxBytes: number;
}

function isFileTooLarge(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "FST_REQ_FILE_TOO_LARGE"
  );
}

function formatMegabytes(bytes: number): string {
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10}MB`;
}

/**
 * Read the first file of a multipart request, capped at `maxBytes`.
 *
 * Fastify's multipart parser stops reading at the cap and reports the file as too large, so a
 * 100 MB body never reaches memory. Checking `buffer.length` after `toBuffer()` is too late: the
 * bytes are already buffered.
 *
 * @returns The file, or `null` when the request carries no file part.
 * @throws DomainError 400 `validation_error` for a refused MIME type, 413 `validation_error` for a file over the cap.
 */
export async function readUploadedFile(
  request: FastifyRequest,
  { allowedMimeTypes, maxBytes }: ReadUploadedFileOptions,
): Promise<UploadedFile | null> {
  const part = await request.file({ limits: { fileSize: maxBytes, files: 1 } });
  if (!part) {
    return null;
  }

  if (allowedMimeTypes && !allowedMimeTypes.includes(part.mimetype)) {
    throw badRequest(
      `Invalid file type. Allowed types: ${allowedMimeTypes.join(", ")}.`,
      "validation_error",
    );
  }

  try {
    const buffer = await part.toBuffer();
    return { buffer, filename: part.filename, mimetype: part.mimetype };
  } catch (error) {
    if (isFileTooLarge(error)) {
      throw new DomainError(
        `File too large. Maximum size is ${formatMegabytes(maxBytes)}.`,
        413,
        "validation_error",
      );
    }
    throw error;
  }
}
