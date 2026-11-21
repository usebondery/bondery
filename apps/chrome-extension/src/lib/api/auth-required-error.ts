export class AuthRequiredError extends Error {
  readonly requiresAuth = true;

  constructor(message: string) {
    super(message);
    this.name = "AuthRequiredError";
  }
}
