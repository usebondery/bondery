const HTTP_AVATAR_URI_PATTERN = /^https?:\/\//i;

export function isHttpAvatarUri(uri: string): boolean {
  return HTTP_AVATAR_URI_PATTERN.test(uri);
}

export function buildPersonAvatarSources(input: {
  localFileUri: string | null;
  skipLocalFile: boolean;
  uri: string | null | undefined;
}): string[] {
  const uri = input.uri?.trim() || null;
  if (uri && !isHttpAvatarUri(uri)) {
    return [uri];
  }

  const sources: string[] = [];
  if (!input.skipLocalFile && input.localFileUri) {
    sources.push(input.localFileUri);
  }
  if (uri && uri !== input.localFileUri) {
    sources.push(uri);
  }
  return sources;
}
