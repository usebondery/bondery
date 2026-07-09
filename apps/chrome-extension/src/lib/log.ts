const DEBUG = import.meta.env.DEV || import.meta.env.WXT_DEBUG === "true";

function sink(level: "log" | "warn" | "error", ...args: unknown[]): void {
  // biome-ignore lint/suspicious/noConsole: centralized extension diagnostics sink
  console[level](...args);
}

export const extLog = {
  debug: (...args: unknown[]) => {
    if (DEBUG) {
      sink("log", ...args);
    }
  },
  error: (...args: unknown[]) => {
    sink("error", ...args);
  },
  warn: (...args: unknown[]) => {
    if (DEBUG) {
      sink("warn", ...args);
    }
  },
};
