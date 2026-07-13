/** Pure wake filtering — used by pull-manager before scheduling a pull. */
export function shouldSchedulePullOnWake(input: {
  serverSequence: number;
  lastServerSequence: number;
  sourceDeviceId?: string;
  myDeviceId?: string;
}): boolean {
  if (input.sourceDeviceId && input.myDeviceId && input.sourceDeviceId === input.myDeviceId) {
    return false;
  }

  return input.serverSequence > input.lastServerSequence;
}
