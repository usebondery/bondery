/**
 * Object storage TLS rules for deploy/bondery compose (see docs/adr/0030-object-storage-tls.mdx):
 * - every stack variant: the stack-secrets job writes one storage volume per consumer, and the
 *   api reaches the S3 gateway over HTTPS with the storage CA, with settings .env cannot change;
 * - every SeaweedFS node starts through the TLS wrapper, reads seaweedfs/security.toml, and mounts
 *   only the cluster volume; security.toml keeps mutual TLS on gRPC and on HTTP between nodes;
 * - the gateway serves the API on HTTPS 8443; the dev overlay keeps TLS and publishes 8443 on
 *   loopback only.
 *
 * Called by check-compose.mjs. Returns error messages; an empty list means the rules hold.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const STACK_FILES = [
  "docker-compose.yml",
  "docker-compose.production.yml",
  "docker-compose.self-hosted.yml",
];

const NODES = ["seaweedfs-master", "seaweedfs-volume", "seaweedfs-filer", "seaweedfs-s3"];
const S3_ENDPOINT_LINE =
  /^\s+BONDERY_PRIVATE_S3_ENDPOINT: https:\/\/\$\{BONDERY_INFRA_TRAEFIK_PREFIX:-bondery\}-storage:8443\s*$/;
const TLS_WRAPPER_ENTRYPOINT =
  /entrypoint:\s*\[\s*"\/bin\/sh",\s*"\/etc\/bondery\/tls-entrypoint\.sh",/;

/**
 * Minimal reader for seaweedfs/security.toml: `[section]` headers and `key = value` lines.
 * @param {string} source
 * @returns {Map<string, Map<string, string>>}
 */
function readToml(source) {
  const sections = new Map([["", new Map()]]);
  let current = sections.get("");
  for (const rawLine of source.split("\n")) {
    const line = rawLine.replace(/#.*$/, "").trim();
    const header = line.match(/^\[([^\]]+)\]$/);
    if (header) {
      current = new Map();
      sections.set(header[1], current);
      continue;
    }
    const pair = line.match(/^([A-Za-z0-9_]+)\s*=\s*(.+)$/);
    if (pair && current) {
      current.set(pair[1], pair[2].replace(/^"(.*)"$/, "$1"));
    }
  }
  return sections;
}

/**
 * @param {{ root: string; serviceBlock: (name: string, source: string) => string }} context
 * @returns {string[]}
 */
export function checkStorageTls({ root, serviceBlock }) {
  const errors = [];

  /** Client side, in every stack variant. */
  function checkStorageTlsClients(label, source) {
    const fail = (message) => {
      errors.push(`${label}: ${message}`);
    };
    const apiBlock = serviceBlock("api", source);
    const secretsBlock = serviceBlock("stack-secrets", source);
    if (!(apiBlock && secretsBlock)) {
      return;
    }
    for (const mount of [
      "- storage-tls-ca:/bondery-storage/ca",
      "- storage-tls-cluster:/bondery-storage/cluster",
      "- storage-tls-client:/bondery-storage/client",
    ]) {
      if (!secretsBlock.includes(mount)) {
        fail(`stack-secrets must mount ${mount.slice(2)}`);
      }
    }
    // The api environment and the ensure-storage-buckets pre_start hook both set the endpoint.
    const endpointLines = apiBlock
      .split("\n")
      .filter((line) => /^\s+BONDERY_PRIVATE_S3_ENDPOINT:/.test(line));
    if (endpointLines.length === 0 || endpointLines.some((line) => !S3_ENDPOINT_LINE.test(line))) {
      fail(
        "api BONDERY_PRIVATE_S3_ENDPOINT must be https://${BONDERY_INFRA_TRAEFIK_PREFIX:-bondery}-storage:8443 (TLS, not overridable from .env)",
      );
    }
    // Every environment that sets the endpoint (api and its pre_start hook) also sets the CA.
    const caLines = apiBlock.match(
      /^\s+BONDERY_PRIVATE_S3_TLS_CA_FILE: \/bondery-storage\/client\/ca\.crt\s*$/gm,
    );
    if ((caLines?.length ?? 0) < Math.max(endpointLines.length, 1)) {
      fail(
        "api (and each pre_start hook that sets the endpoint) must trust the storage CA: BONDERY_PRIVATE_S3_TLS_CA_FILE: /bondery-storage/client/ca.crt",
      );
    }
    if (!apiBlock.includes("- storage-tls-client:/bondery-storage/client:ro")) {
      fail("api must mount storage-tls-client read-only");
    }
    if (/storage-tls-(?:ca|cluster):/.test(apiBlock)) {
      fail("api must not mount the storage CA or cluster key volumes");
    }
  }

  /** Server side: every SeaweedFS node, the gateway listeners, and the scripts they run. */
  function checkStorageTlsNodes() {
    const label = "docker-compose.seaweedfs.yml";
    const seaweedText = readFileSync(resolve(root, label), "utf8");
    const fail = (message) => {
      errors.push(`${label}: ${message}`);
    };
    for (const name of NODES) {
      const block = serviceBlock(name, seaweedText);
      if (!block) {
        continue;
      }
      if (!TLS_WRAPPER_ENTRYPOINT.test(block)) {
        fail(`${name} must start through seaweedfs/tls-entrypoint.sh`);
      }
      if (!/stack-secrets:\s*\n\s*condition:\s*service_completed_successfully/.test(block)) {
        fail(
          `${name} must depends_on stack-secrets with condition: service_completed_successfully`,
        );
      }
      if (!/tmpfs:\s*\n\s*- \/run\/bondery-storage/.test(block)) {
        fail(`${name} must copy the TLS key into a tmpfs at /run/bondery-storage`);
      }
      for (const mount of [
        "- storage-tls-cluster:/bondery-storage/cluster:ro",
        "- ./seaweedfs/security.toml:/etc/seaweedfs/security.toml:ro",
        "- ./seaweedfs/tls-entrypoint.sh:/etc/bondery/tls-entrypoint.sh:ro",
      ]) {
        if (!block.includes(mount)) {
          fail(`${name} must mount ${mount.slice(2)}`);
        }
      }
      if (/storage-tls-(?:ca|client):/.test(block)) {
        fail(`${name} must not mount the storage CA or client volumes`);
      }
      if (name !== "seaweedfs-s3" && !/tls-health\.sh",\s*"https:\/\//.test(block)) {
        fail(`${name} healthcheck must probe HTTPS through seaweedfs/tls-health.sh`);
      }
    }
    if (!/command: "volume [^"]*-ip=seaweedfs-volume/.test(seaweedText)) {
      fail("seaweedfs-volume must register as -ip=seaweedfs-volume, a name the certificate covers");
    }

    const entrypoint = readFileSync(resolve(root, "seaweedfs/entrypoint.sh"), "utf8");
    for (const [pattern, message] of [
      [/-port\.https=8443/, "seaweedfs/entrypoint.sh must serve the API on HTTPS 8443"],
      [
        /-cert\.file=\/run\/bondery-storage\/tls\/tls\.crt/,
        "seaweedfs/entrypoint.sh must serve the cluster certificate",
      ],
      [
        /-key\.file=\/run\/bondery-storage\/tls\/tls\.key/,
        "seaweedfs/entrypoint.sh must set -key.file",
      ],
      [/exec su-exec seaweed weed s3/, "seaweedfs/entrypoint.sh must run the gateway as seaweed"],
      [/-port\.iceberg=0/, "seaweedfs/entrypoint.sh must keep the plaintext Iceberg catalog off"],
    ]) {
      if (!pattern.test(entrypoint)) {
        fail(message);
      }
    }
    const wrapper = readFileSync(resolve(root, "seaweedfs/tls-entrypoint.sh"), "utf8");
    if (!/install -o seaweed -g seaweed -m 0600 [^\n]*tls\.key/.test(wrapper)) {
      fail("seaweedfs/tls-entrypoint.sh must copy the key with mode 0600 owned by seaweed");
    }
    const ready = readFileSync(resolve(root, "seaweedfs/s3-ready.sh"), "utf8");
    if (!/--cacert [^\n]*https:\/\/localhost:8443\//.test(ready)) {
      fail("seaweedfs/s3-ready.sh must check the HTTPS listener against the storage CA");
    }
  }

  /**
   * The public storage domain: Traefik forwards reads over HTTPS (8443), verifies the storage CA
   * with the published transport, and drops cookies and credentials.
   */
  function checkStoragePublicRoute() {
    const label = "docker-compose.seaweedfs.yml";
    const block = serviceBlock("seaweedfs-s3", readFileSync(resolve(root, label), "utf8"));
    if (!block) {
      return;
    }
    const P = "\\$\\{BONDERY_INFRA_TRAEFIK_PREFIX:-bondery\\}";
    for (const [pattern, message, expected = true] of [
      [/-storage\.loadbalancer\.server\.port=8443"/, "Traefik must forward to the HTTPS port 8443"],
      [/-storage\.loadbalancer\.server\.scheme=https"/, "Traefik must use scheme https"],
      [
        new RegExp(`-storage\\.loadbalancer\\.serverstransport=${P}-storage@file"`),
        "Traefik must verify the storage CA with the published transport (<prefix>-storage@file)",
      ],
      [/loadbalancer\.server\.port=8333/, "Traefik must not forward to the HTTP port 8333", false],
      [
        /-storage\.rule=Host\(`[^`]+`\) && \(Method\(`GET`\) \|\| Method\(`HEAD`\) \|\| Method\(`OPTIONS`\)\)"/,
        "the public storage router must match GET, HEAD, and OPTIONS only",
      ],
      [
        new RegExp(`-storage\\.middlewares=${P}-storage-public-read"`),
        "the public storage router must use the <prefix>-storage-public-read middleware",
      ],
      [
        /-storage-public-read\.headers\.customrequestheaders\.Cookie="/,
        "the public-read middleware must drop the Cookie header",
      ],
      [
        /-storage-public-read\.headers\.customrequestheaders\.Authorization="/,
        "the public-read middleware must drop the Authorization header",
      ],
      [
        /traefik-transport:\s*\n\s*condition:\s*service_completed_successfully/,
        "seaweedfs-s3 must depends_on traefik-transport with condition: service_completed_successfully",
      ],
    ]) {
      if (pattern.test(block) !== expected) {
        errors.push(`${label}: seaweedfs-s3 ${message}`);
      }
    }
  }

  /** security.toml: mutual TLS everywhere, pinned to the certificate the job issues. */
  function checkSecurityToml() {
    const label = "seaweedfs/security.toml";
    const fail = (message) => {
      errors.push(`${label}: ${message}`);
    };
    const toml = readToml(readFileSync(resolve(root, label), "utf8"));
    const get = (section, key) => toml.get(section)?.get(key) ?? "";

    const secretsSource = readFileSync(
      resolve(root, "../../apps/api/src/lib/infra-secrets/storage-secrets.ts"),
      "utf8",
    );
    const commonName = secretsSource.match(/STORAGE_CERTIFICATE_COMMON_NAME = "([^"]+)"/)?.[1];
    if (!commonName) {
      fail("cannot find STORAGE_CERTIFICATE_COMMON_NAME in storage-secrets.ts");
    }

    if (!get("grpc", "ca")) {
      fail("[grpc] ca must be set (it turns on mutual TLS for gRPC)");
    }
    for (const component of ["master", "volume", "filer", "s3"]) {
      const section = `grpc.${component}`;
      if (!(get(section, "cert") && get(section, "key"))) {
        fail(`[${section}] must set cert and key`);
      }
      if (commonName && get(section, "allowed_commonNames") !== commonName) {
        fail(`[${section}] allowed_commonNames must be "${commonName}" (the cluster certificate)`);
      }
    }
    if (!(get("grpc.client", "cert") && get("grpc.client", "key"))) {
      fail("[grpc.client] must set cert and key");
    }
    if (get("https.client", "enabled") !== "true") {
      fail("[https.client] enabled must be true (HTTPS between nodes)");
    }
    if (!get("https.client", "ca") || get("https.client", "insecure_skip_verify") === "true") {
      fail("[https.client] must verify servers against the storage CA");
    }
    for (const component of ["master", "volume", "filer"]) {
      const section = `https.${component}`;
      // `ca` makes the server require a client certificate from the storage CA.
      for (const key of ["cert", "key", "ca"]) {
        if (!get(section, key)) {
          fail(`[${section}] must set ${key}`);
        }
      }
      if (get(section, "disable_tls_verify_client_cert") === "true") {
        fail(`[${section}] must verify client certificates`);
      }
    }
    // With only a minimum, SeaweedFS 4.40 rejects the gRPC TLS settings and serves plaintext.
    if (!(get("tls", "min_version") && get("tls", "max_version"))) {
      fail("[tls] must set both min_version and max_version");
    }
  }

  /** Local dev SeaweedFS keeps TLS and publishes the HTTPS listener on loopback only. */
  function checkDevOverlay() {
    const label = "docker-compose.seaweedfs.dev.yml";
    const devText = readFileSync(resolve(root, label), "utf8");
    const fail = (message) => {
      errors.push(`${label}: ${message}`);
    };
    for (const name of NODES) {
      const block = serviceBlock(name, devText);
      if (
        block &&
        !block.includes("- ../../.temp/storage-secrets/cluster:/bondery-storage/cluster:ro")
      ) {
        fail(`${name} must mount the dev cluster certificate from .temp/storage-secrets`);
      }
    }
    if (!/- "127\.0\.0\.1:8443:8443"/.test(devText)) {
      fail("seaweedfs-s3 must publish HTTPS 8443 on 127.0.0.1 only");
    }
    if (/- "(?:0\.0\.0\.0:)?\d+:8443"/.test(devText)) {
      fail("seaweedfs-s3 must not publish 8443 on all interfaces");
    }
    if (/security\.toml:[^\n]*!reset|tls-entrypoint\.sh[^\n]*!reset/.test(devText)) {
      fail("the dev overlay must keep security.toml and the TLS wrapper");
    }
  }

  for (const file of STACK_FILES) {
    checkStorageTlsClients(file, readFileSync(resolve(root, file), "utf8"));
  }
  checkStorageTlsNodes();
  checkStoragePublicRoute();
  checkSecurityToml();
  checkDevOverlay();

  return errors;
}
