export async function register() {
  if (process.env["NEXT_RUNTIME"] !== "nodejs") {
    return;
  }

  const { validateWebsiteStartup } = await import("@/lib/platform/validateWebsiteStartup.node");
  validateWebsiteStartup();
}
