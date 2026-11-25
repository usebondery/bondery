import { buildApiErrorFromResponse } from "@bondery/helpers/api";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { buildBonderyExportFilename, type ExportSummaryResponse } from "@bondery/schemas";
import {
  applyTransportResponsePolicy,
  clientApiFetch,
  clientApiJsonOrNull,
} from "@/lib/api/client";

const FILENAME_PATTERN = /filename="(?<group1>[^"]+)"/iu;

export function parseBonderyExportFilename(
  contentDisposition: string | null,
  fallbackDate: Date = new Date(),
): string {
  const match = contentDisposition?.match(FILENAME_PATTERN);
  return match?.[1] ?? buildBonderyExportFilename(fallbackDate);
}

export async function getExportSummary(init?: RequestInit): Promise<ExportSummaryResponse | null> {
  return clientApiJsonOrNull<ExportSummaryResponse>(API_ROUTES.ME_EXPORT_SUMMARY, init);
}

export async function downloadBonderyExport(
  init?: RequestInit,
): Promise<{ blob: Blob; filename: string }> {
  const response = await clientApiFetch(API_ROUTES.ME_EXPORT, init);
  if (!response.ok) {
    applyTransportResponsePolicy(response);
    const bodyText = await response.text();
    throw buildApiErrorFromResponse({
      bodyText,
      status: response.status,
    });
  }

  const filename = parseBonderyExportFilename(response.headers.get("Content-Disposition"));
  const blob = await response.blob();
  return { blob, filename };
}

export class BonderyExportDownloadBlockedError extends Error {
  constructor(message = "download_blocked", options?: ErrorOptions) {
    super(message, options);
    this.name = "BonderyExportDownloadBlockedError";
  }
}

export function saveBonderyExportFile(blob: Blob, filename: string): void {
  try {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.download = filename;
    anchor.href = url;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  } catch (error) {
    throw new BonderyExportDownloadBlockedError("download_blocked", { cause: error });
  }
}
