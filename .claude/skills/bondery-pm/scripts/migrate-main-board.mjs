#!/usr/bin/env node
/**
 * Bulk-migrate MAIN Plane work items to bondery-pm conventions.
 * Run via Cursor agent with Plane MCP — this script documents migration logic.
 *
 * Usage (agent): paginate list_work_items, apply migrateItem() per row, update_work_item.
 */

const PROJECT_ID = "5ab1d2fc-fe39-4adf-af3c-bad0165e151f";
const DEFAULT_OWNER = "fe2bd70b-7756-40cf-b771-c767fc2c3559";
/** MAIN project members valid for assignees (API rejects others). */
const VALID_ASSIGNEES = new Set([DEFAULT_OWNER]);

const STATES = {
  /** Legacy — removed post-migration; mapState still handles if encountered */
  backlog: "9a91a8c3-76a3-48ea-9613-bbd9a54dd575",
  bet: "a78477d7-bcc0-4659-879f-a640e5c36008",
  betNext: "fcbaa781-5998-404b-b212-4d7e2cc30cb6",
  blocked: "e056ac17-2981-41d2-bb8d-67d0c23793e8",
  building: "e4b710f8-c9d0-410a-82e6-08223d5c2d5e",
  icebox: "dfe776d8-97de-4fdd-8d47-380db2c407a7",
  inbox: "94a37b5a-efab-4a97-ad54-bb175fbd5423",
  released: "33044163-08ad-40da-b032-691ce60e02a6",
  releaseQueue: "446b1f35-c481-486d-8c2f-eb76fdd42ad9",
  /** Legacy — removed post-migration */
  todo: "455c18d8-ea08-4ff5-98c2-1f7bfd73d8bd",
  wontDo: "76b82d71-b89e-4b4c-b8c5-9abcf3bea31b",
};

const LABELS = {
  legacyBigFeatures: "21ebcb4f-8965-4bb2-a536-6ea735aa6b7a",
  legacyBugs: "97c0e882-6828-4bd1-b63c-f60dee75a0e2",
  legacyBusiness: "af82972f-2deb-4581-9214-f4f02207d01d",
  legacyFunding: "6e5a2164-154c-4073-923e-36c3d5e4d449",
  sourceFounder: "4a81add8-d169-4f90-8759-eabdcb29481c",
  sourceUsers: "566adc26-175e-4539-a7a3-15814fa5a7de",
  surfaceApi: "d2ea6a28-97e4-4e52-9092-85a2554c0560",
  surfaceDocs: "071084c0-f850-4e70-bd97-55a989f4b9b1",
  surfaceExtension: "8122d619-2131-4ef0-bf7f-4cdf7218be3a",
  surfaceInfra: "f6e6fcff-5266-4eed-b3fb-3e628ee53713",
  surfaceMobile: "f50f8778-0427-435f-b49c-84b3e100bf2d",
  surfaceWebapp: "1e7f2400-14a6-49a4-8dc2-5c88a49e0ed4",
};

const TITLE_PREFIX_RE = /^\[(Bug|Chore|Feature|Research|Business Ops)\]\s+/;
const ROADMAP_RE = /ROADMAP-(\d+)/i;

const STATE_MAP = {
  [STATES.backlog]: STATES.icebox,
  [STATES.todo]: STATES.betNext,
  [STATES.building]: STATES.building,
  [STATES.blocked]: STATES.blocked,
  [STATES.releaseQueue]: STATES.releaseQueue,
  [STATES.released]: STATES.released,
  [STATES.wontDo]: STATES.wontDo,
};

export function mapState(currentStateId) {
  return STATE_MAP[currentStateId] ?? currentStateId;
}

/** Strip an existing type prefix so inference can run again. */
export function stripTitlePrefix(name) {
  return (name ?? "").trim().replace(TITLE_PREFIX_RE, "");
}

const ENGINEERING_SUBTASK_RE =
  /^(DB(?:\s+migration)?|API(?:\s*\+\s*Types)?|API\/Data|Server component|Client component|Client UI|Navigation|Translations|Edge cases|Webapp|Mobile|Docs|Compose|Infra|Tests|Types|Prisma schema|Cleanup|Upload|Migration|Env[:/]|Install and configure|Person detail|Bridge|Rewrite|Remove pepper|Schema \+|Stripe|Archive apps)\b/i;

const BUSINESS_OPS_RE =
  /\b(reddit|linkedin|facebook|instagram|trustpilot|hacker news|product hunt|mastodon|posts on|chrome store|about page|maskot|bondery\.com|schedule calls with reddit)\b/i;

const FEATURE_RE =
  /\b(import data|export|onboarding tutorial|open contact|vcard|e2ee|encrypt|graph node|voice notes|smart (?:search|message)|related contacts|recommendation on who|mcp\/cli|ai parse|replace hero|double sidebar|monicahq|dex|filters in addition|mobile basic contact|keep in touch)\b/i;

export function inferTypePrefix(item, labelIds) {
  const name = stripTitlePrefix(item.name ?? "");
  const desc = item.description_stripped ?? item.description_html ?? "";
  const text = `${name} ${desc}`;
  const labels = new Set(labelIds);

  if (
    labels.has(LABELS.legacyBugs) ||
    /\b(bug|fix\b|broken|regression|crash|doesn'?t work)\b/i.test(name)
  ) {
    return "Bug";
  }
  if (labels.has(LABELS.legacyBigFeatures) || ROADMAP_RE.test(text)) {
    return "Feature";
  }
  if (labels.has(LABELS.legacyBusiness) || /\b(ISO|SOC|tax|legal|GDPR|LLC)\b/i.test(name)) {
    return "Business Ops";
  }
  if (BUSINESS_OPS_RE.test(name)) {
    return "Business Ops";
  }
  if (/\b(spike|evaluate|research|ADR)\b/i.test(text)) {
    return "Research";
  }
  if (FEATURE_RE.test(name)) {
    return "Feature";
  }
  if (ENGINEERING_SUBTASK_RE.test(name)) {
    return "Chore";
  }
  if (
    /\b(upgrade|deps|compose|docker|traefik|env manifest|changelog|smoke|rls|migration tests)\b/i.test(
      name,
    )
  ) {
    return "Chore";
  }
  return "Chore";
}

export function formatTitle(item, typePrefix) {
  const raw = stripTitlePrefix(item.name ?? "");
  return `[${typePrefix}] ${raw}`;
}

const PLACEHOLDER_OUTCOMES =
  /^(what|overview|i18n|libsodium|maskot|tbd|pending review|see outcome(?:\s*—\s*pending review)?|n\/a)$/i;

/** First substantive line from the ## Outcome description section. */
export function extractOutcome(descriptionStripped) {
  const text = descriptionStripped ?? "";
  const match = text.match(/^Outcome\n([\s\S]*?)(?:\nSanity check|\nNotes|\nRoadmap|$)/);
  const line =
    match?.[1]
      ?.split("\n")
      .map((l) => l.trim())
      .find(Boolean) ?? "";
  if (!line || PLACEHOLDER_OUTCOMES.test(line)) {
    return "";
  }
  return line.replace(/\s+/g, " ").trim();
}

function capitalizeOutcome(sentence) {
  const trimmed = sentence.replace(/\.$/, "").trim();
  if (!trimmed) {
    return trimmed;
  }
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/** True when the title body already reads like an outcome, not a label or component. */
export function isOutcomeOrientedTitle(body) {
  const title = (body ?? "").trim();
  if (!title) {
    return false;
  }
  if (ENGINEERING_SUBTASK_RE.test(title)) {
    return true;
  }
  if (/^(LLC|ISO\s*\d+|Trustpilot|DUNS|GDPR|SOC\s*2?)$/i.test(title)) {
    return false;
  }
  const words = title.split(/\s+/);
  const hasOutcomeVerb =
    /\b(let|users?|enable|fix|reduce|improve|ship|secure|file|publish|migrate|create|after|export|import|obtain|register|transfer|evaluate|research|connect|add|remove|upgrade|deploy|document)\b/i.test(
      title,
    );
  if (words.length <= 3 && !hasOutcomeVerb && title.length < 24) {
    return false;
  }
  if (words.length === 1 && title.length < 16) {
    return false;
  }
  return hasOutcomeVerb || title.length >= 24;
}

/** Build `[Type] outcome` using the description Outcome section when the title is label-like. */
export function outcomeTitle(item, typePrefix) {
  const body = stripTitlePrefix(item.name ?? "");
  const outcome = extractOutcome(item.description_stripped);
  if (!outcome || isOutcomeOrientedTitle(body)) {
    return formatTitle(item, typePrefix);
  }
  const outcomeWords = outcome.split(/\s+/).length;
  const bodyWords = body.split(/\s+/).length;
  // Do not replace a descriptive title with a shorter label-like outcome.
  if (outcomeWords === 1 && bodyWords > 1) {
    return formatTitle(item, typePrefix);
  }
  if (outcome.length < body.length * 0.65 && body.length > 14) {
    return formatTitle(item, typePrefix);
  }
  const sentence = capitalizeOutcome(outcome);
  if (PLACEHOLDER_OUTCOMES.test(sentence)) {
    return formatTitle(item, typePrefix);
  }
  return `[${typePrefix}] ${sentence}`;
}

/** Recompute type prefix and outcome-oriented title from current fields. */
export function retitleItem(item) {
  const typePrefix = inferTypePrefix(item, item.labels ?? []);
  return outcomeTitle(item, typePrefix);
}

export function inferLabels(item, labelIds) {
  const desc = item.description_stripped ?? item.description_html ?? "";
  const name = item.name ?? "";
  const labels = new Set(labelIds);

  let source = LABELS.sourceFounder;
  if (labels.has(LABELS.legacyBugs)) {
    source = LABELS.sourceUsers;
  }

  let surface = LABELS.surfaceInfra;
  if (/docs\/|\.md|documentation/i.test(desc)) {
    surface = LABELS.surfaceDocs;
  } else if (/apps\/mobile|Mobile:/i.test(desc + name)) {
    surface = LABELS.surfaceMobile;
  } else if (/apps\/webapp|webapp/i.test(desc + name)) {
    surface = LABELS.surfaceWebapp;
  } else if (/chrome|extension/i.test(desc + name)) {
    surface = LABELS.surfaceExtension;
  } else if (/apps\/api|\/api\//i.test(desc + name)) {
    surface = LABELS.surfaceApi;
  }

  return [source, surface];
}

export function buildDescription(item) {
  const existing = item.description_stripped?.trim() ?? "";
  const roadmap = existing.match(ROADMAP_RE);
  const hasSanity = existing.includes("## Sanity check");
  const hasLegacy = existing.includes("Legacy migration");

  if (hasSanity) {
    return item.description_html ?? `<p>${existing}</p>`;
  }

  const outcome = existing.split("\n")[0] || item.name;
  let html = `<h2>Outcome</h2><p>${escapeHtml(outcome)}</p>`;
  html += `<h2>Sanity check</h2><ul>`;
  html += `<li><strong>Who is the user?</strong> operator/founder</li>`;
  html += `<li><strong>What pain or opportunity?</strong> See outcome — pending review</li>`;
  html += `<li><strong>How do we know?</strong> founder</li>`;
  html += `<li><strong>Smallest shippable slice:</strong> not this week</li>`;
  html += `<li><strong>How will we know it worked?</strong> pending review</li>`;
  html += `</ul>`;

  if (roadmap) {
    html += `<h2>Roadmap</h2><p>ROADMAP-${roadmap[1]} — see public roadmap.</p>`;
  }

  if (!hasLegacy) {
    html += `<blockquote><p>Legacy migration — sanity check pending review</p></blockquote>`;
  }

  if (existing && !existing.startsWith("##")) {
    html += `<h2>Notes</h2><p>${escapeHtml(existing)}</p>`;
  }

  return html;
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function migrateItem(item) {
  const labelIds = item.labels ?? [];
  const typePrefix = inferTypePrefix(item, labelIds);
  const newState = mapState(item.state);
  const [source, surface] = inferLabels(item, labelIds);
  const assigneeIds = (item.assignees ?? [])
    .map((a) => (typeof a === "string" ? a : a?.id))
    .filter((id) => id && VALID_ASSIGNEES.has(id));

  return {
    assignees: assigneeIds.length ? assigneeIds : [DEFAULT_OWNER],
    description_html: buildDescription(item),
    labels: [source, surface],
    name: outcomeTitle(item, typePrefix),
    priority: "none",
    project_id: PROJECT_ID,
    roadmapMatch: (item.description_stripped ?? "").match(ROADMAP_RE),
    state: newState,
    work_item_id: item.id,
  };
}

if (process.argv[1]?.endsWith("migrate-main-board.mjs")) {
  console.log(JSON.stringify({ LABELS, PROJECT_ID, STATES }, null, 2));
}
