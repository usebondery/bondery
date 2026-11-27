/**
 * The `type` of the read-only input. A secret value stays masked until the reader
 * reveals it. A plain value is always text.
 */
function resolveCopyableInputType(isSecret: boolean, isRevealed: boolean): "password" | "text" {
  return isSecret && !isRevealed ? "password" : "text";
}

export { resolveCopyableInputType };
