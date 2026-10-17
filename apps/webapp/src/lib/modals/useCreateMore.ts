"use client";

import { useState } from "react";

/**
 * Owns the Create more switch outside Mantine `useForm`. Starts off every time
 * the modal opens. When `enabled` is false, the value stays off.
 */
export function useCreateMore(options?: { enabled?: boolean }): {
  createMore: boolean;
  setCreateMore: (checked: boolean) => void;
} {
  const enabled = options?.enabled ?? true;
  const [createMore, setCreateMoreState] = useState(false);

  const setCreateMore = (checked: boolean) => {
    if (!enabled) {
      return;
    }
    setCreateMoreState(checked);
  };

  if (!enabled) {
    return { createMore: false, setCreateMore };
  }

  return { createMore, setCreateMore };
}
