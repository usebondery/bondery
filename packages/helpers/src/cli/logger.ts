/**
 * Branded CLI logger for Bondery monorepo scripts.
 * Zero dependencies beyond ANSI escapes. Respects NO_COLOR and non-TTY.
 */

const BRAND_BG = "\x1b[48;2;157;63;201m";
const WHITE_BOLD = "\x1b[1;37m";
const RESET = "\x1b[0m";

const LEVEL_BG = {
  error: "\x1b[48;2;220;38;38m",
  info: "\x1b[48;2;37;99;235m",
  success: "\x1b[48;2;22;163;74m",
  warn: "\x1b[48;2;217;119;6m",
} as const;

type Level = keyof typeof LEVEL_BG;

function useColor(): boolean {
  if (process.env.NO_COLOR !== undefined) {
    return false;
  }
  if (process.env.FORCE_COLOR === "0") {
    return false;
  }
  return Boolean(process.stdout.isTTY);
}

function padLevel(level: Level): string {
  return level.toUpperCase().padEnd(7);
}

function formatLine(level: Level, message: string, colored: boolean): string {
  if (!colored) {
    return `Bondery | ${padLevel(level)} | ${message}`;
  }
  const brand = `${BRAND_BG}${WHITE_BOLD} Bondery ${RESET}`;
  const levelBlock = `${LEVEL_BG[level]}${WHITE_BOLD} ${padLevel(level)} ${RESET}`;
  return `🟣 ${brand} │ ${levelBlock} │ ${message}`;
}

export type CliLogger = {
  error: (message: string) => void;
  info: (message: string) => void;
  step: (current: number, total: number, message: string) => void;
  success: (message: string) => void;
  table: (rows: Array<Record<string, string | number>>) => void;
  warn: (message: string) => void;
};

export function createCliLogger(_scope?: string): CliLogger {
  const colored = useColor();

  const write = (level: Level, message: string, stream: NodeJS.WriteStream = process.stdout) => {
    stream.write(`${formatLine(level, message, colored)}\n`);
  };

  return {
    error(message: string) {
      write("error", message, process.stderr);
      process.exitCode = 1;
    },
    info(message: string) {
      write("info", message);
    },
    step(current: number, total: number, message: string) {
      write("info", `[${current}/${total}] ${message}`);
    },
    success(message: string) {
      write("success", message);
    },
    table(rows: Array<Record<string, string | number>>) {
      if (rows.length === 0) {
        return;
      }
      const first = rows[0];
      if (!first) {
        return;
      }
      const keys = Object.keys(first);
      const widths = keys.map((k) =>
        Math.max(k.length, ...rows.map((r) => String(r[k] ?? "").length)),
      );
      const line = (cols: string[]) => cols.map((c, i) => c.padEnd(widths[i] ?? 0)).join("  ");
      write("info", line(keys));
      for (const row of rows) {
        write("info", line(keys.map((k) => String(row[k] ?? ""))));
      }
    },
    warn(message: string) {
      write("warn", message);
    },
  };
}
