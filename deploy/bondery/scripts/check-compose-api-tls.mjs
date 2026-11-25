/**
 * Internal API TLS rules for deploy/bondery compose (see docs/adr/0031-internal-api-tls.mdx), in
 * every stack variant:
 * - the stack-secrets job writes one API TLS volume per consumer;
 * - the api serves HTTPS only, from the api-tls-server volume, and its healthcheck uses it too;
 * - the webapp calls that listener over https:// and trusts the API CA, with settings .env
 *   cannot change.
 *
 * Called by check-compose.mjs. Returns error messages; an empty list means the rules hold.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * @param {unknown} value
 * @returns {string}
 */
function asString(value) {
  return typeof value === "string" ? value : "";
}

const STACK_FILES = [
  "docker-compose.yml",
  "docker-compose.production.yml",
  "docker-compose.self-hosted.yml",
];

/** Exact `environment:` lines, so a default or .env interpolation cannot weaken them. */
const API_PORT = "26631";

const API_LINES = [
  [
    new RegExp(`^\\s+API_PORT: "${API_PORT}"\\s*$`, "m"),
    `api must set API_PORT: "${API_PORT}" (its only listener, HTTPS)`,
  ],
  [
    /^\s+BONDERY_PRIVATE_API_TLS_CERT_FILE: \/bondery-api\/server\/tls\.crt\s*$/m,
    "api must serve HTTPS with BONDERY_PRIVATE_API_TLS_CERT_FILE: /bondery-api/server/tls.crt",
  ],
  [
    /^\s+BONDERY_PRIVATE_API_TLS_KEY_FILE: \/bondery-api\/server\/tls\.key\s*$/m,
    "api must serve HTTPS with BONDERY_PRIVATE_API_TLS_KEY_FILE: /bondery-api/server/tls.key",
  ],
];

/** The healthcheck uses the HTTPS listener too, and verifies it against the API CA. */
const API_HEALTHCHECK = new RegExp(
  String.raw`require\('node:https'\)\.get\(\{ca:require\('node:fs'\)\.readFileSync\('\/bondery-api\/client\/ca\.crt'\),host:'127\.0\.0\.1',path:'\/health\/live',port:${API_PORT}\}`,
);

const WEBAPP_LINES = [
  [
    new RegExp(
      String.raw`^\s+BONDERY_INFRA_INTERNAL_API_URL: https:\/\/\$\{BONDERY_INFRA_TRAEFIK_PREFIX:-bondery\}-api:${API_PORT}\s*$`,
      "m",
    ),
    `webapp BONDERY_INFRA_INTERNAL_API_URL must be the internal HTTPS listener: https:// + the BONDERY_INFRA_TRAEFIK_PREFIX api alias + :${API_PORT}`,
  ],
  [
    /^\s+BONDERY_INFRA_INTERNAL_API_CA_FILE: \/bondery-api\/client\/ca\.crt\s*$/m,
    "webapp must trust the API CA: BONDERY_INFRA_INTERNAL_API_CA_FILE: /bondery-api/client/ca.crt",
  ],
];

const API_TLS_CA_VOLUME_RE = /api-tls-ca:/;
/**
 * The API serves HTTPS only: the retired plaintext listener used `API_TLS_PORT` and a loopback
 * `http://` healthcheck. The port number itself is now the HTTPS listener.
 */
const API_PLAIN_HTTP_RE = /API_TLS_PORT|http:\/\/127\.0\.0\.1/;
const STACK_SECRETS_COMPLETED_RE =
  /stack-secrets:\s*\n\s*condition:\s*service_completed_successfully/;
const API_TLS_CA_OR_SERVER_VOLUME_RE = /api-tls-(?:ca|server):/;
const VOLUMES_RESET_RE = /volumes: !reset \[\]/;
const PREFIX_CHARSET_RE = /\*\[!a-z0-9-\]\*/;
const API_OR_STORAGE_CASE_RE = /^\s+api \| storage\) ;;$/m;
const TRANSPORT_TARGET_RE = /target="\$DYNAMIC_DIR\/\$name-transport\.yml"/;
const ATOMIC_MV_RE = /mv -f "\$staging" "\$target"/;

/**
 * The job that publishes the API and storage serversTransports writes into Traefik's dynamic
 * folder, so it stays minimal: [pattern, message, expected match (default true)].
 */
const TRANSPORT_JOB_RULES = [
  [
    /^\s+image: busybox:\d/m,
    "traefik-transport must run a pinned busybox image, not the API image",
  ],
  [/^\s+network_mode: none\s*$/m, "traefik-transport must run without a network"],
  [/^\s+read_only: true\s*$/m, "traefik-transport must have a read-only root filesystem"],
  [/cap_drop:\s*\n\s*- ALL/, "traefik-transport must drop all capabilities"],
  [
    /cap_add:/,
    "traefik-transport must not add capabilities: Traefik's dynamic folder is root-owned, so root with cap_drop ALL can write it",
    false,
  ],
  [/no-new-privileges:true/, "traefik-transport must set no-new-privileges"],
  [
    /^\s+- api-tls-client:\/bondery-api\/client:ro\s*$/m,
    "traefik-transport must mount api-tls-client read-only",
  ],
  [
    /^\s+- storage-tls-traefik:\/bondery-storage\/traefik:ro\s*$/m,
    "traefik-transport must mount storage-tls-traefik read-only (its own client certificate)",
  ],
  [
    /^\s+- storage-tls-client:\/bondery-storage\/client:ro\s*$/m,
    "traefik-transport must not mount the API's storage client volume",
    false,
  ],
  [
    /^\s+- \.\/traefik\/publish-transports\.sh:\/bondery\/publish-transports\.sh:ro\s*$/m,
    "traefik-transport must run deploy/bondery/traefik/publish-transports.sh, mounted read-only",
  ],
  [
    /source: \$\{BONDERY_INFRA_TRAEFIK_DYNAMIC_DIR:-\/etc\/dokploy\/traefik\/dynamic\}\s*\n\s*target: \/traefik-dynamic\s*\n\s*bind:\s*\n\s*create_host_path: false/,
    "traefik-transport must bind ${BONDERY_INFRA_TRAEFIK_DYNAMIC_DIR:-/etc/dokploy/traefik/dynamic} at /traefik-dynamic with create_host_path: false (fail, never create it)",
  ],
  [
    /(?:api|storage)-tls-(?:ca|server|cluster):|docker\.sock/,
    "traefik-transport must not mount keys or the Docker socket",
    false,
  ],
  [
    STACK_SECRETS_COMPLETED_RE,
    "traefik-transport must depends_on stack-secrets with condition: service_completed_successfully",
  ],
];

/** Traefik forwards to the HTTPS listener and verifies it with the published transport. */
const API_LABEL_RULES = [
  [
    new RegExp(`-api\\.loadbalancer\\.server\\.port=${API_PORT}"`),
    `api Traefik service must forward to the HTTPS listener (loadbalancer.server.port=${API_PORT})`,
  ],
  [
    /-api\.loadbalancer\.server\.scheme=https"/,
    "api Traefik service must use loadbalancer.server.scheme=https",
  ],
  [
    /-api\.loadbalancer\.serverstransport=\$\{BONDERY_INFRA_TRAEFIK_PREFIX:-bondery\}-api@file"/,
    "api Traefik service must use the published serversTransport (<prefix>-api@file)",
  ],
  [
    // Traefik speaks TLS to the API only. A second scheme or a plaintext backend URL would
    // reintroduce the hop this design removed.
    /loadbalancer\.server\.scheme=http"/,
    "api Traefik service must not forward over plaintext http",
    false,
  ],
  [
    /traefik-transport:\s*\n\s*condition:\s*service_completed_successfully/,
    "api must depends_on traefik-transport with condition: service_completed_successfully",
  ],
];

const SECRETS_MOUNTS = [
  "api-tls-ca:/bondery-api/ca",
  "api-tls-server:/bondery-api/server",
  "api-tls-client:/bondery-api/client",
];

/** Every rule for one stack variant: [service, holds(serviceBlock), message]. */
const RULES = [
  ...SECRETS_MOUNTS.map((mount) => [
    "stack-secrets",
    (block) => block.includes(`- ${mount}`),
    `stack-secrets must mount ${mount}`,
  ]),
  ...API_LINES.map(([pattern, message]) => ["api", (block) => pattern.test(block), message]),
  [
    "api",
    (block) => block.includes("- api-tls-server:/bondery-api/server:ro"),
    "api must mount api-tls-server read-only",
  ],
  [
    "api",
    (block) => block.includes("- api-tls-client:/bondery-api/client:ro"),
    "api must mount api-tls-client read-only (the CA certificate for its healthcheck)",
  ],
  [
    "api",
    (block) => !API_TLS_CA_VOLUME_RE.test(block),
    "api must not mount the API CA key volume (api-tls-ca)",
  ],
  [
    "api",
    (block) => API_HEALTHCHECK.test(block),
    `api healthcheck must request https://127.0.0.1:${API_PORT}/health/live and verify the API CA`,
  ],
  [
    "api",
    (block) => !API_PLAIN_HTTP_RE.test(block),
    "api must not use API_TLS_PORT or a loopback http:// healthcheck: the API serves HTTPS only",
  ],
  [
    "api",
    (block) => STACK_SECRETS_COMPLETED_RE.test(block),
    "api must depends_on stack-secrets with condition: service_completed_successfully",
  ],
  ...WEBAPP_LINES.map(([pattern, message]) => ["webapp", (block) => pattern.test(block), message]),
  [
    "webapp",
    (block) => block.includes("- api-tls-client:/bondery-api/client:ro"),
    "webapp must mount api-tls-client read-only",
  ],
  [
    "webapp",
    (block) => !API_TLS_CA_OR_SERVER_VOLUME_RE.test(block),
    "webapp must not mount the API CA or server key volumes",
  ],
  ...TRANSPORT_JOB_RULES.map(([pattern, message, expected = true]) => [
    "traefik-transport",
    (block) => pattern.test(block) === expected,
    message,
  ]),
  ...API_LABEL_RULES.map(([pattern, message, expected = true]) => [
    "api",
    (block) => pattern.test(block) === expected,
    message,
  ]),
];

/**
 * @param {{ root: string; serviceBlock: (name: string, source: string) => string }} context
 * @returns {string[]}
 */
export function checkApiTls({ root, serviceBlock }) {
  const errors = [];
  for (const label of STACK_FILES) {
    const source = readFileSync(resolve(root, label), "utf8");
    /** @type {Map<string, string>} */
    const blocks = new Map();
    const blockOf = (service) => {
      if (!blocks.has(service)) {
        blocks.set(service, serviceBlock(service, source));
      }
      return asString(blocks.get(service));
    };
    for (const [service, holds, message] of RULES) {
      const block = blockOf(service);
      if (block && !holds(block)) {
        errors.push(`${label}: ${message}`);
      }
    }
  }

  // Copied as is by hosts without Traefik, which put their own proxy in front: the job must do
  // nothing there, and no stack port may be reachable from other machines.
  const overrideLabel = "docker-compose.override.yml.example";
  const overrideText = readFileSync(resolve(root, overrideLabel), "utf8");
  const overrideBlock = serviceBlock("traefik-transport", overrideText);
  if (!(overrideBlock && VOLUMES_RESET_RE.test(overrideBlock))) {
    errors.push(`${overrideLabel}: traefik-transport must drop its volumes (volumes: !reset [])`);
  }
  for (const [, mapping] of overrideText.matchAll(/^\s+- "([^"]+:\d+)"\s*$/gm)) {
    if (!mapping.startsWith("127.0.0.1:")) {
      errors.push(
        `${overrideLabel}: publish ${mapping} on 127.0.0.1 only; a reverse proxy serves it`,
      );
    }
  }

  const script = readFileSync(resolve(root, "traefik/publish-transports.sh"), "utf8");
  for (const [pattern, message] of [
    [PREFIX_CHARSET_RE, "must reject a prefix outside [a-z0-9-]"],
    [API_OR_STORAGE_CASE_RE, "must publish only the api and storage transports"],
    [TRANSPORT_TARGET_RE, "must write only <prefix>-<service>-transport.yml"],
    [ATOMIC_MV_RE, "must replace a file atomically (staging file, then mv)"],
  ]) {
    if (!pattern.test(script)) {
      errors.push(`traefik/publish-transports.sh ${message}`);
    }
  }
  return errors;
}
