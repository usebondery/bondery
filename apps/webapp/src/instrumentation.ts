export async function register() {
  if (process.env["NEXT_RUNTIME"] !== "nodejs") {
    return;
  }

  const { validateWebappStartup } = await import("@/lib/platform/validateWebappStartup.node");
  validateWebappStartup();
}
