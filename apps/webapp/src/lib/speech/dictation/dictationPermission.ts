/**
 * Reads the microphone permission state without a prompt.
 *
 * The first click must never be a dead control. A granted or denied state is
 * known before the click, so the control can show the right icon and tooltip.
 * `null` is a normal result: Safari does not expose this query.
 */
export type DictationPermissionState = PermissionState | null;

interface MicrophonePermissionDescriptor {
  name: "microphone";
}

/**
 * Queries the microphone permission.
 *
 * `name: "microphone"` is not in the `PermissionName` union of every DOM typing
 * set. The assertion is the whole DOM interop this module needs: the browser
 * accepts the name at runtime, and a browser that does not rejects the query,
 * which returns `null` here.
 */
export async function readDictationPermission(): Promise<DictationPermissionState> {
  const permissions = globalThis.navigator?.permissions;
  if (!permissions || typeof permissions.query !== "function") {
    return null;
  }

  try {
    const descriptor: MicrophonePermissionDescriptor = { name: "microphone" };
    const status = await permissions.query(descriptor as PermissionDescriptor);
    return status.state;
  } catch {
    return null;
  }
}
