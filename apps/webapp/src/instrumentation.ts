export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { validateWebappRuntimeConfigAtStartup } = await import(
    "@/lib/platform/runtimeConfig.server"
  );

  try {
    validateWebappRuntimeConfigAtStartup();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // biome-ignore lint/suspicious/noConsole: fail-fast boot diagnostics before logger exists
    console.error(`[webapp] Runtime config validation failed:\n${message}`);
    process.exit(1);
  }
}
