import { buildApp } from "../build-app.js";

export async function createTestApp() {
  const app = await buildApp();
  await app.ready();
  return app;
}
