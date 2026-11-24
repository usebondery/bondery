export class ExtensionOutdatedError extends Error {
  readonly extensionOutdated = true;

  constructor(message: string) {
    super(message);
    this.name = "ExtensionOutdatedError";
  }
}
