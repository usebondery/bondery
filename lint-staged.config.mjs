/** @type {import('lint-staged').Configuration} */
export default {
  "{apps/api/src/**/*.ts,packages/schemas/src/**/*.ts}": () =>
    "npm run generate-openapi -w apps/api",
  "*": "biome check --write --no-errors-on-unmatched --files-ignore-unknown=true",
};
