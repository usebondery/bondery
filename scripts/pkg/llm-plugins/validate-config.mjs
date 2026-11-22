const PATTERN_5E5B412D5A5D_RE = /^[A-Z]{2}$/;
const PRICE_PRICING_TRIAL_CHECKOUT_RE = /\b(price|pricing|trial|checkout)\b/i;
const SKILLS_Z0_SKILL_MD_RE = /^\.\/skills\/[a-z0-9-]+\/SKILL\.md$/;
const PATTERN_5E5B5E5C7340_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Shape rules for `llm-plugins/src/plugin.config.json`. */

function requireString(value, label, max) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string.`);
  }
  if (max !== undefined && value.length > max) {
    throw new Error(`${label} is ${value.length} characters. The limit is ${max}.`);
  }
}

function requireList(items, label, maxItems, maxLength) {
  if (!Array.isArray(items) || items.length === 0 || items.length > maxItems) {
    throw new Error(`${label} must hold 1 to ${maxItems} items.`);
  }
  for (const item of items) {
    requireString(item, label, maxLength);
  }
}

function validateOpenAiAuth(openai) {
  const client = openai.auth?.client ?? {};
  const secret = "clientId" in client || "clientSecret" in client || "clientSecret" in openai.auth;
  if (openai.auth?.type !== "oauth" || client.mode !== "cimd" || secret) {
    throw new Error("OpenAI auth must be oauth / cimd with no client id or secret.");
  }
}

function validatePublication(openai) {
  const countries = openai.publication?.countries;
  const publicationKeys = Object.keys(openai.publication ?? {});
  const countriesOk = Array.isArray(countries);
  const publicationOk = publicationKeys.length === 1 && publicationKeys[0] === "countries";
  if (!countriesOk || !publicationOk) {
    throw new Error("publication.countries must be an array. Use [] for no country limit.");
  }
  for (const code of countries) {
    if (!PATTERN_5E5B412D5A5D_RE.test(code)) {
      throw new Error("publication.countries must use uppercase country codes.");
    }
  }
}

function validateCopy(openai) {
  requireString(openai.shortDescription, "shortDescription", 30);
  requireString(openai.longDescription, "longDescription", 4000);
  requireString(openai.review?.commerce_description, "commerce_description");
  requireList(openai.capabilities, "capabilities", 20, 120);
  if (PRICE_PRICING_TRIAL_CHECKOUT_RE.test(openai.longDescription)) {
    throw new Error("longDescription must not mention price, trial, or checkout.");
  }
  if (!Array.isArray(openai.defaultPrompt) || openai.defaultPrompt.length !== 3) {
    throw new Error("defaultPrompt must hold 3 strings.");
  }
  for (const prompt of openai.defaultPrompt) {
    requireString(prompt, "defaultPrompt", 128);
    if (prompt.includes("@")) {
      throw new Error("defaultPrompt must not contain an @mention.");
    }
  }
  requireString(openai.onboardingSkill, "onboardingSkill");
  if (!SKILLS_Z0_SKILL_MD_RE.test(openai.onboardingSkill)) {
    throw new Error("onboardingSkill must be ./skills/<name>/SKILL.md.");
  }
}

function validateReview(openai) {
  const banned = JSON.stringify(openai).includes("Claude");
  const extraField = openai.review?.demo_recording_url !== undefined;
  if (banned || extraField || openai.review?.commerce !== false) {
    throw new Error("Omit Claude, publication, demo_recording_url, and commerce sales.");
  }
  const positive = openai.review?.test_cases?.positive;
  const negative = openai.review?.test_cases?.negative;
  if (!Array.isArray(positive) || positive.length !== 5) {
    throw new Error("Review needs 5 positive cases and 3 negative cases.");
  }
  if (!Array.isArray(negative) || negative.length !== 3) {
    throw new Error("Review needs 5 positive cases and 3 negative cases.");
  }
  for (const item of positive) {
    for (const key of ["description", "prompt", "tools_triggered", "expected_behavior"]) {
      requireString(item?.[key], `positive.${key}`);
    }
  }
  for (const item of negative) {
    requireString(item?.description, "negative.description");
    requireString(item?.prompt, "negative.prompt");
  }
}

export function validateConfig(config) {
  if (!config || typeof config !== "object" || Object.hasOwn(config, "version")) {
    throw new Error("plugin.config.json must not set version.");
  }
  const claude = config.hosts?.claude;
  const openai = config.hosts?.openai;
  if (claude?.mcpType !== "http" || openai?.mcpType !== "streamable-http") {
    throw new Error("MCP types must be http and streamable-http.");
  }
  requireString(config.author?.email, "author.email", 320);
  if (!PATTERN_5E5B5E5C7340_RE.test(config.author.email)) {
    throw new Error("author.email must be an email address.");
  }
  validateCopy(openai);
  validateOpenAiAuth(openai);
  validatePublication(openai);
  validateReview(openai);
}

export function requireVersion(version) {
  if (typeof version !== "string" || version.trim() === "") {
    throw new Error("Version is missing.");
  }
}
