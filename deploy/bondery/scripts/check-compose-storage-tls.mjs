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
const HASH_COMMENT_RE = /#.*$/;
const TOML_HEADER_RE = /^\[([^\]]+)\]$/;
const TOML_PAIR_RE = /^([A-Za-z0-9_]+)\s*=\s*(.+)$/;
const TOML_QUOTED_VALUE_RE = /^"(.*)"$/;
const S3_ENDPOINT_KEY_RE = /^\s+BONDERY_PRIVATE_S3_ENDPOINT:/;
const STORAGE_TLS_CA_OR_CLUSTER_VOLUME_RE = /storage-tls-(?:ca|cluster):/;
const STACK_SECRETS_COMPLETED_RE =
  /stack-secrets:\s*\n\s*condition:\s*service_completed_successfully/;
const STORAGE_TMPFS_RE = /tmpfs:\s*\n\s*- \/run\/bondery-storage/;
const STORAGE_TLS_CA_OR_CLIENT_VOLUME_RE = /storage-tls-(?:ca|client):/;
const TLS_HEALTH_HTTPS_RE = /tls-health\.sh",\s*"https:\/\//;
const VOLUME_IP_RE = /command: "volume [^"]*-ip=seaweedfs-volume/;
const S3_HTTPS_PORT_RE = /-port\.https=8443/;
const S3_CERT_FILE_RE = /-cert\.file=\/run\/bondery-storage\/tls\/tls\.crt/;
const S3_KEY_FILE_RE = /-key\.file=\/run\/bondery-storage\/tls\/tls\.key/;
/** The gateway requires a client certificate from the storage CA (mutual TLS). */
const S3_VERIFY_CLIENT_CERT_RE = /-tlsVerifyClientCert(\s|$)/;
const S3_CLIENT_CA_FILE_RE = /-cacert\.file=\/run\/bondery-storage\/tls\/ca\.crt/;
const STORAGE_CLIENT_CERT_ENV_LINE =
  /^\s+BONDERY_PRIVATE_S3_TLS_CERT_FILE: \/bondery-storage\/client\/tls\.crt\s*$/;
const STORAGE_CLIENT_KEY_ENV_LINE =
  /^\s+BONDERY_PRIVATE_S3_TLS_KEY_FILE: \/bondery-storage\/client\/tls\.key\s*$/;
const STORAGE_API_KEY_MOUNT_RE = /storage-tls-traefik:\/bondery-storage\/traefik/;
const WEED_S3_EXEC_RE = /exec su-exec seaweed weed s3/;
const ICEBERG_PORT_OFF_RE = /-port\.iceberg=0/;
const STORAGE_KEY_INSTALL_RE = /install -o seaweed -g seaweed -m 0600 [^\n]*tls\.key/;
const S3_READY_CACERT_RE = /--cacert [^\n]*https:\/\/localhost:8443\//;
const TRAEFIK_STORAGE_PORT_8443_RE = /-storage\.loadbalancer\.server\.port=8443"/;
const TRAEFIK_STORAGE_SCHEME_HTTPS_RE = /-storage\.loadbalancer\.server\.scheme=https"/;
const TRAEFIK_STORAGE_HTTP_PORT_8333_RE = /loadbalancer\.server\.port=8333/;
const TRAEFIK_STORAGE_PUBLIC_METHODS_RE =
  /-storage\.rule=Host\(`[^`]+`\) && \(Method\(`GET`\) \|\| Method\(`HEAD`\) \|\| Method\(`OPTIONS`\)\)"/;
const TRAEFIK_DROP_COOKIE_RE = /-storage-public-read\.headers\.customrequestheaders\.Cookie="/;
const TRAEFIK_DROP_AUTHORIZATION_RE =
  /-storage-public-read\.headers\.customrequestheaders\.Authorization="/;
const TRAEFIK_TRANSPORT_COMPLETED_RE =
  /traefik-transport:\s*\n\s*condition:\s*service_completed_successfully/;
const STORAGE_CERTIFICATE_COMMON_NAME_RE = /STORAGE_CERTIFICATE_COMMON_NAME = "([^"]+)"/;
const DEV_S3_LOOPBACK_PORT_RE = /- "127\.0\.0\.1:8443:8443"/;
const PUBLIC_S3_PORT_RE = /- "(?:0\.0\.0\.0:)?\d+:8443"/;
const DEV_TLS_RESET_RE = /security\.toml:[^\n]*!reset|tls-entrypoint\.sh[^\n]*!reset/;

/**
 * The transport job must publish the storage client certificate as a PATH Traefik can read.
 *
 * A `serversTransport` accepts `certFile` and `keyFile`. It has no inline `cert` field: inlining
 * the pair makes Traefik reject the whole file with "field not found, node: cert". The job copies
 * the material into Traefik's dynamic folder, which it does mount, and references it from there.
 *
 * The CA stays inline under `rootCAs`, which the schema does accept. Traefik fails SILENTLY when a
 * `rootCAs` path is unreadable: no error line, and every route using that transport answers 500.
 * A CA holds no private key, so keeping it in the file removes one way to get this wrong.
 */
const TRANSPORT_STORAGE_CLIENT_CERT_SOURCE_RE = /dirname "\$ca_file"\)\/tls\.crt/;
const TRANSPORT_CLIENT_CERT_BLOCK_RE = /echo " +certificates:"/;
const TRANSPORT_CERT_FILE_RE = /echo " +- certFile: \$DYNAMIC_DIR\/\$name-client\.crt"/;
const TRANSPORT_KEY_FILE_RE = /echo " +keyFile: \$DYNAMIC_DIR\/\$name-client\.key"/;
const TRANSPORT_COPY_CERT_RE = /copy_pem "\$cert_file" CERTIFICATE/;
const TRANSPORT_COPY_KEY_RE = /copy_pem "\$key_file" "PRIVATE KEY"/;
/** The CA is inlined into rootCAs, not copied to a path Traefik might fail to resolve. */
const TRANSPORT_ROOT_CA_INLINE_RE = /inline_pem "\$ca_file" CERTIFICATE/;
/** An inline client cert or key is the regression this check exists to catch. */
const TRANSPORT_INLINE_CLIENT_PAIR_FORBIDDEN_RE = /echo "[^"]*-( cert|key): \|"/;
const TRANSPORT_FILE_MODE_RE = /chmod 0600 "\$staging"/;

/** The example proxy configurations must reach the gateway, which requires a client certificate. */
const CADDY_CLIENT_CERT_RE =
  /tls_client_auth \/etc\/caddy\/bondery-storage\/tls\.crt \/etc\/caddy\/bondery-storage\/tls\.key/;
const NGINX_CLIENT_CERT_RE = /proxy_ssl_certificate \/etc\/nginx\/bondery-storage\/tls\.crt;/;
const NGINX_CLIENT_KEY_RE = /proxy_ssl_certificate_key \/etc\/nginx\/bondery-storage\/tls\.key;/;

/**
 * Minimal reader for seaweedfs/security.toml: `[section]` headers and `key = value` lines.
 * @param {string} source
 * @returns {Map<string, Map<string, string>>}
 */
function readToml(source) {
  const sections = new Map([["", new Map()]]);
  let current = sections.get("");
  for (const rawLine of source.split("\n")) {
    const line = rawLine.replace(HASH_COMMENT_RE, "").trim();
    const header = line.match(TOML_HEADER_RE);
    if (header) {
      current = new Map();
      sections.set(header[1], current);
      continue;
    }
    const pair = line.match(TOML_PAIR_RE);
    if (pair && current) {
      current.set(pair[1], pair[2].replace(TOML_QUOTED_VALUE_RE, "$1"));
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
      "- storage-tls-traefik:/bondery-storage/traefik",
    ]) {
      if (!secretsBlock.includes(mount)) {
        fail(`stack-secrets must mount ${mount.slice(2)}`);
      }
    }
    // The api environment and the ensure-storage-buckets pre_start hook both set the endpoint.
    const endpointLines = apiBlock.split("\n").filter((line) => S3_ENDPOINT_KEY_RE.test(line));
    if (endpointLines.length === 0 || endpointLines.some((line) => !S3_ENDPOINT_LINE.test(line))) {
      fail(
        "api BONDERY_PRIVATE_S3_ENDPOINT must be https://${BONDERY_INFRA_TRAEFIK_PREFIX:-bondery}-storage:8443 (TLS, not overridable from .env)",
      );
    }
    // Every environment that sets the endpoint (api and its pre_start hook) also sets the CA and,
    // because the gateway requires one, the client certificate pair.
    const requiredLines = Math.max(endpointLines.length, 1);
    const caLines = apiBlock.match(
      /^\s+BONDERY_PRIVATE_S3_TLS_CA_FILE: \/bondery-storage\/client\/ca\.crt\s*$/gm,
    );
    if ((caLines?.length ?? 0) < requiredLines) {
      fail(
        "api (and each pre_start hook that sets the endpoint) must trust the storage CA: BONDERY_PRIVATE_S3_TLS_CA_FILE: /bondery-storage/client/ca.crt",
      );
    }
    for (const [pattern, message] of [
      [
        STORAGE_CLIENT_CERT_ENV_LINE,
        "api must present its storage client certificate: BONDERY_PRIVATE_S3_TLS_CERT_FILE: /bondery-storage/client/tls.crt",
      ],
      [
        STORAGE_CLIENT_KEY_ENV_LINE,
        "api must present its storage client key: BONDERY_PRIVATE_S3_TLS_KEY_FILE: /bondery-storage/client/tls.key",
      ],
    ]) {
      const lines = apiBlock.match(new RegExp(pattern.source, "gm"));
      if ((lines?.length ?? 0) < requiredLines) {
        fail(message);
      }
    }
    if (!apiBlock.includes("- storage-tls-client:/bondery-storage/client:ro")) {
      fail("api must mount storage-tls-client read-only");
    }
    if (STORAGE_API_KEY_MOUNT_RE.test(apiBlock)) {
      fail("api must not mount the Traefik client certificate volume (storage-tls-traefik)");
    }
    if (STORAGE_TLS_CA_OR_CLUSTER_VOLUME_RE.test(apiBlock)) {
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
      if (!STACK_SECRETS_COMPLETED_RE.test(block)) {
        fail(
          `${name} must depends_on stack-secrets with condition: service_completed_successfully`,
        );
      }
      if (!STORAGE_TMPFS_RE.test(block)) {
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
      if (STORAGE_TLS_CA_OR_CLIENT_VOLUME_RE.test(block)) {
        fail(`${name} must not mount the storage CA or client volumes`);
      }
      if (name !== "seaweedfs-s3" && !TLS_HEALTH_HTTPS_RE.test(block)) {
        fail(`${name} healthcheck must probe HTTPS through seaweedfs/tls-health.sh`);
      }
    }
    if (!VOLUME_IP_RE.test(seaweedText)) {
      fail("seaweedfs-volume must register as -ip=seaweedfs-volume, a name the certificate covers");
    }

    const entrypoint = readFileSync(resolve(root, "seaweedfs/entrypoint.sh"), "utf8");
    for (const [pattern, message] of [
      [S3_HTTPS_PORT_RE, "seaweedfs/entrypoint.sh must serve the API on HTTPS 8443"],
      [S3_CERT_FILE_RE, "seaweedfs/entrypoint.sh must serve the cluster certificate"],
      [S3_KEY_FILE_RE, "seaweedfs/entrypoint.sh must set -key.file"],
      [
        S3_VERIFY_CLIENT_CERT_RE,
        "seaweedfs/entrypoint.sh must require a client certificate on 8443 (-tlsVerifyClientCert)",
      ],
      [
        S3_CLIENT_CA_FILE_RE,
        "seaweedfs/entrypoint.sh must verify client certificates against the storage CA (-cacert.file)",
      ],
      [WEED_S3_EXEC_RE, "seaweedfs/entrypoint.sh must run the gateway as seaweed"],
      [ICEBERG_PORT_OFF_RE, "seaweedfs/entrypoint.sh must keep the plaintext Iceberg catalog off"],
    ]) {
      if (!pattern.test(entrypoint)) {
        fail(message);
      }
    }
    const wrapper = readFileSync(resolve(root, "seaweedfs/tls-entrypoint.sh"), "utf8");
    if (!STORAGE_KEY_INSTALL_RE.test(wrapper)) {
      fail("seaweedfs/tls-entrypoint.sh must copy the key with mode 0600 owned by seaweed");
    }
    const ready = readFileSync(resolve(root, "seaweedfs/s3-ready.sh"), "utf8");
    if (!S3_READY_CACERT_RE.test(ready)) {
      fail("seaweedfs/s3-ready.sh must check the HTTPS listener against the storage CA");
    }
  }

  /**
   * The public storage domain: Traefik forwards reads over HTTPS (8443), verifies the storage CA
   * with the published transport, and drops cookies and credentials. The gateway requires a client
   * certificate, so the transport must carry one, and it must come from the Traefik-only volume.
   */
  function checkStoragePublicRoute() {
    const label = "docker-compose.seaweedfs.yml";
    const block = serviceBlock("seaweedfs-s3", readFileSync(resolve(root, label), "utf8"));
    if (!block) {
      return;
    }
    const P = "\\$\\{BONDERY_INFRA_TRAEFIK_PREFIX:-bondery\\}";
    for (const [pattern, message, expected = true] of [
      [TRAEFIK_STORAGE_PORT_8443_RE, "Traefik must forward to the HTTPS port 8443"],
      [TRAEFIK_STORAGE_SCHEME_HTTPS_RE, "Traefik must use scheme https"],
      [
        new RegExp(`-storage\\.loadbalancer\\.serverstransport=${P}-storage@file"`),
        "Traefik must verify the storage CA with the published transport (<prefix>-storage@file)",
      ],
      [TRAEFIK_STORAGE_HTTP_PORT_8333_RE, "Traefik must not forward to the HTTP port 8333", false],
      [
        TRAEFIK_STORAGE_PUBLIC_METHODS_RE,
        "the public storage router must match GET, HEAD, and OPTIONS only",
      ],
      [
        new RegExp(`-storage\\.middlewares=${P}-storage-public-read"`),
        "the public storage router must use the <prefix>-storage-public-read middleware",
      ],
      [TRAEFIK_DROP_COOKIE_RE, "the public-read middleware must drop the Cookie header"],
      [
        TRAEFIK_DROP_AUTHORIZATION_RE,
        "the public-read middleware must drop the Authorization header",
      ],
      [
        TRAEFIK_TRANSPORT_COMPLETED_RE,
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
    const commonName = secretsSource.match(STORAGE_CERTIFICATE_COMMON_NAME_RE)?.[1];
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

  /**
   * The transport job writes Traefik's configuration for the storage route. The gateway requires a
   * client certificate, so the published transport must carry one, referenced by a path Traefik
   * can read: an inline `cert`/`key` pair is not in the serversTransport schema and makes Traefik
   * discard the file, which drops the router.
   */
  function checkTransportJobClientCertificate() {
    const label = "traefik/publish-transports.sh";
    const script = readFileSync(resolve(root, label), "utf8");
    for (const [pattern, message] of [
      [
        TRANSPORT_STORAGE_CLIENT_CERT_SOURCE_RE,
        "must read the storage client certificate from the Traefik-only volume path",
      ],
      [TRANSPORT_CLIENT_CERT_BLOCK_RE, "must set a client certificate on the storage transport"],
      [TRANSPORT_CERT_FILE_RE, "must reference the client certificate as certFile"],
      [TRANSPORT_KEY_FILE_RE, "must reference the client key as keyFile"],
      [
        TRANSPORT_COPY_CERT_RE,
        "must copy the client certificate into Traefik's dynamic folder, the only place Traefik reads",
      ],
      [
        TRANSPORT_COPY_KEY_RE,
        "must copy the client key into Traefik's dynamic folder, the only place Traefik reads",
      ],
      [
        TRANSPORT_ROOT_CA_INLINE_RE,
        "must inline the CA under rootCAs: a rootCAs path that Traefik cannot read fails silently",
      ],
      [TRANSPORT_FILE_MODE_RE, "must write the transport file with mode 0600 (it holds a key)"],
    ]) {
      if (!pattern.test(script)) {
        errors.push(`${label}: ${message}`);
      }
    }
    if (TRANSPORT_INLINE_CLIENT_PAIR_FORBIDDEN_RE.test(script)) {
      errors.push(
        `${label}: must not inline the client cert or key. A serversTransport has no inline \`cert\` field, so Traefik rejects the file with "field not found, node: cert" and drops the router.`,
      );
    }
  }

  /**
   * The example proxy configurations reach the gateway, which requires a client certificate.
   * A proxy without one cannot serve the storage domain, so both examples must carry it.
   */
  function checkExampleProxies() {
    const rules = [
      [
        "proxy/Caddyfile",
        CADDY_CLIENT_CERT_RE,
        "must present the storage client certificate (tls_client_auth)",
      ],
      [
        "proxy/nginx.conf",
        NGINX_CLIENT_CERT_RE,
        "must present the storage client certificate (proxy_ssl_certificate)",
      ],
      [
        "proxy/nginx.conf",
        NGINX_CLIENT_KEY_RE,
        "must present the storage client key (proxy_ssl_certificate_key)",
      ],
    ];
    for (const [file, pattern, message] of rules) {
      const source = readFileSync(resolve(root, file), "utf8");
      if (!pattern.test(source)) {
        errors.push(`${file}: ${message}`);
      }
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
    if (!DEV_S3_LOOPBACK_PORT_RE.test(devText)) {
      fail("seaweedfs-s3 must publish HTTPS 8443 on 127.0.0.1 only");
    }
    if (PUBLIC_S3_PORT_RE.test(devText)) {
      fail("seaweedfs-s3 must not publish 8443 on all interfaces");
    }
    if (DEV_TLS_RESET_RE.test(devText)) {
      fail("the dev overlay must keep security.toml and the TLS wrapper");
    }
  }

  for (const file of STACK_FILES) {
    checkStorageTlsClients(file, readFileSync(resolve(root, file), "utf8"));
  }
  checkStorageTlsNodes();
  checkStoragePublicRoute();
  checkSecurityToml();
  checkTransportJobClientCertificate();
  checkExampleProxies();
  checkDevOverlay();

  return errors;
}
