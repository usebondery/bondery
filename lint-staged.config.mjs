/** @type {import('lint-staged').Configuration} */
export default {
  "{apps/api/src/**/*.ts,packages/schemas/src/**/*.ts}": () =>
    "npm run generate-openapi -w apps/api",
};
