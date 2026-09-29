export function isMcpWriteToolName(name: string): boolean {
  return /^(create|update|delete)_/.test(name);
}
