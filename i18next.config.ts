export default {
  extract: {
    input: "src/**/*.{js,jsx,ts,tsx}",
    output: "public/locales/{{language}}/{{namespace}}.json",
  },
  locales: ["(en", "cs", "de)"],
};
