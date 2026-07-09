import { headers } from "next/headers";

export async function getCspNonce(): Promise<string | undefined> {
  return (await headers()).get("x-nonce") ?? undefined;
}
