/** Manifest builders for the Claude and OpenAI plugin trees. */
import { MCP_SCHEMA, object, PLUGIN_SCHEMA } from "./json-format.mjs";

function author(config) {
  return object([
    ["email", config.author.email],
    ["name", config.author.name],
    ["url", config.author.url],
  ]);
}

function mcpServer(config, type, extra) {
  return object([["type", type], ["url", config.mcp.url], ...extra]);
}

function caseFields(item, keys) {
  return object(keys.map((key) => [key, item[key]]));
}

export function claudeManifest(config, version) {
  const { links } = config;
  return object([
    ["author", author(config)],
    ["description", config.description],
    ["displayName", config.displayName],
    ["documentationUrl", links.documentation],
    ["homepage", links.homepage],
    ["icon", "./assets/icon.png"],
    ["keywords", config.keywords],
    ["license", config.license],
    ["name", config.name],
    ["privacyPolicyUrl", links.privacy],
    ["repository", config.repository],
    ["supportUrl", links.support],
    ["termsOfServiceUrl", links.terms],
    ["version", version],
  ]);
}

export function claudeMcp(config) {
  const server = mcpServer(config, config.hosts.claude.mcpType, []);
  return object([["mcpServers", object([[config.mcp.serverName, server]])]]);
}

function openAiInterfaceFields(config, brandColor) {
  const host = config.hosts.openai;
  const { links } = config;
  return object([
    ["displayName", config.displayName],
    ["shortDescription", host.shortDescription],
    ["longDescription", host.longDescription],
    ["developerName", host.developerName],
    ["category", host.category],
    ["capabilities", host.capabilities],
    ["websiteURL", links.homepage],
    ["supportURL", links.support],
    ["privacyPolicyURL", links.privacy],
    ["termsOfServiceURL", links.terms],
    ["defaultPrompt", host.defaultPrompt],
    ["brandColor", brandColor],
    ["brandColorDark", brandColor],
    ["composerIcon", "./assets/icon.png"],
    ["composerIconDark", "./assets/icon.png"],
    ["logo", "./assets/icon.png"],
    ["logoDark", "./assets/icon.png"],
    ["onboardingSkill", host.onboardingSkill],
  ]);
}

function openAiReview(host) {
  return object([
    [
      "test_cases",
      object([
        [
          "positive",
          host.review.test_cases.positive.map((item) =>
            caseFields(item, ["description", "prompt", "tools_triggered", "expected_behavior"]),
          ),
        ],
        [
          "negative",
          host.review.test_cases.negative.map((item) =>
            caseFields(item, ["description", "prompt"]),
          ),
        ],
      ]),
    ],
    ["commerce", host.review.commerce],
    ["commerce_description", host.review.commerce_description],
  ]);
}

export function openAiManifest(config, version, brandColor) {
  const host = config.hosts.openai;
  const { links } = config;
  const extension = object([
    ["interface", openAiInterfaceFields(config, brandColor)],
    ["publication", { countries: host.publication.countries }],
    ["review", openAiReview(host)],
  ]);
  return object([
    ["$schema", PLUGIN_SCHEMA],
    ["name", config.name],
    ["version", version],
    ["description", config.description],
    ["author", author(config)],
    ["homepage", links.homepage],
    ["repository", config.repository],
    ["license", config.license],
    ["keywords", config.keywords],
    ["extensions", object([["com.openai", extension]])],
  ]);
}

export function openAiMcp(config) {
  const auth = object([
    ["type", config.hosts.openai.auth.type],
    ["client", object([["mode", config.hosts.openai.auth.client.mode]])],
  ]);
  const extensions = object([["com.openai", object([["auth", auth]])]]);
  const server = mcpServer(config, config.hosts.openai.mcpType, [["extensions", extensions]]);
  return object([
    ["$schema", MCP_SCHEMA],
    ["mcpServers", object([[config.mcp.serverName, server]])],
  ]);
}
