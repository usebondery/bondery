export type CheckReport = {
  add: (message: string) => void;
  failIfNeeded: () => void;
  ok: (detail?: string) => void;
  readonly violations: string[];
};

export function createCheck(name: string): CheckReport;
