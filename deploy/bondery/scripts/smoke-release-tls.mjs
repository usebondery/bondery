/**
 * TLS assertions for the release smoke (smoke-release.mjs). They run against the live stack,
 * because some failures only show at runtime: SeaweedFS, for one, falls back to plaintext gRPC
 * with only a log warning when its TLS settings are invalid.
 *
 * Each assertion takes a context:
 * - compose(args, input?): runs `docker compose <args>` for the smoke stack and returns the
 *   spawnSync result (utf8);
 * - fail(message, output?): reports the failure and exits.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const HTTP_NODES = ["seaweedfs-master:9333", "seaweedfs-volume:8080", "seaweedfs-filer:8888"];
const GRPC_NODES = [
  "seaweedfs-master:19333",
  "seaweedfs-volume:18080",
  "seaweedfs-filer:18888",
  "seaweedfs-s3:18333",
];
const INLINE_PEM_CERT_RE = / {10}-----BEGIN CERTIFICATE-----[\s\S]+? {10}-----END CERTIFICATE-----/;
const LEADING_TEN_SPACES_RE = /^ {10}/;
/** Transport file structure: the client certificate block and its inline private key. */
const TRANSPORT_CLIENT_CERTS_RE = /^ {6}certificates:$/m;
const TRANSPORT_CLIENT_KEY_RE = /^ {10}key: \|$/m;
const TRANSPORT_PRIVATE_KEY_RE = /-----BEGIN PRIVATE KEY-----/;
const TRANSPORT_ROOT_CAS_RE = /^ {6}rootCAs:$/m;
const API_TRANSPORT_FILE_RE = /-api-transport\.yml$/;
const POSTGRES_NO_ENCRYPTION_RE = /no encryption/;
const POSTGRES_CERT_VERIFY_FAILED_RE = /certificate verify failed/i;

/**
 * @param {unknown} value
 * @returns {unknown}
 */
function asUnknown(value) {
  return value;
}

/** The probe result: the last stdout line, or an empty object (which fails every check). */
function parseLastJsonLine(stdout) {
  try {
    return asUnknown(JSON.parse(stdout.trim().split("\n").at(-1) ?? "{}"));
  } catch {
    return {};
  }
}

/** Blocks the smoke for `ms` milliseconds. */
function pause(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/** @param {{ stdout?: string; stderr?: string; status?: number | null }} result */
function shellOutput(result) {
  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

/** @param {{ stdout?: string; status?: number | null }} result */
function answeredPong(result) {
  return result.status === 0 && (result.stdout ?? "").includes("PONG");
}

/**
 * @param {{ compose: Function; fail: Function }} context
 * @param {(result: { stdout?: string; stderr?: string; status?: number | null }) => string} output
 */
function assertRedisUntrustedClientCert({ compose, fail }, output) {
  const opensslProbe = compose(
    `exec -T redis sh -c 'command -v openssl >/dev/null 2>&1 && echo yes || echo no'`,
  );
  if (!(opensslProbe.stdout ?? "").trim().endsWith("yes")) {
    console.log(
      "Redis mutual TLS: skipped untrusted client certificate probe (openssl missing in image)",
    );
    return;
  }
  const untrusted = compose(
    `exec -T redis sh -c 'TMP=$(mktemp -d); openssl req -x509 -newkey rsa:2048 -keyout "$TMP/key.pem" -out "$TMP/cert.pem" -days 1 -nodes -subj /CN=wrong 2>/dev/null; REDISCLI_AUTH="$(cat /bondery-redis/server/password)" redis-cli --tls --cert "$TMP/cert.pem" --key "$TMP/key.pem" --cacert /bondery-redis/server/ca.crt -h localhost -p 6379 ping; ec=$?; rm -rf "$TMP"; exit $ec'`,
  );
  if (answeredPong(untrusted)) {
    fail("Redis accepted a client certificate not signed by its CA", output(untrusted));
  }
}

/** The Docker health status of the api container, from `docker compose ps --format json`. */
function apiHealth(compose) {
  const lines = (compose("ps --format json api").stdout ?? "").split("\n").filter(Boolean);
  for (const line of lines) {
    try {
      const row = JSON.parse(line);
      if (row.Service === "api") {
        return row.Health ?? "";
      }
    } catch {
      // A line that is not JSON is ignored.
    }
  }
  return "";
}

/**
 * Runs inside the api container: one HTTPS request that trusts only the given CA, and presents a
 * client certificate when the service requires one.
 */
const TRANSPORT_CA_PROBE = (host, port, path, ca, client) => `
import { readFileSync } from "node:fs";
import { request } from "node:https";
${
  client
    ? `const cert = readFileSync(${JSON.stringify(client.cert)});
const key = readFileSync(${JSON.stringify(client.key)});`
    : ""
}
const req = request(
  {
    ca: ${JSON.stringify(ca)},
    ...(${client ? "{ cert, key }" : "{}"}),
    host: ${JSON.stringify(host)},
    path: ${JSON.stringify(path)},
    port: ${port},
    servername: ${JSON.stringify(host)},
  },
  (res) => { console.log(\`status \${res.statusCode}\`); res.resume(); },
);
req.on("error", (error) => console.log(\`error \${error.code ?? error.message}\`));
req.end();
`;

/**
 * Probes run inside the S3 gateway container, which has curl and the cluster certificate.
 * Each line prints `<name> <curl exit code> <http code>`.
 */
export const STORAGE_TLS_PROBES = `
T=/run/bondery-storage/tls
probe() { name=$1; shift; code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 5 "$@" 2>/dev/null); echo "$name $? $code"; }
probe gateway-https --cacert $T/ca.crt --cert $T/tls.crt --key $T/tls.key https://seaweedfs-s3:8443/
probe gateway-untrusted --cert $T/tls.crt --key $T/tls.key https://seaweedfs-s3:8443/
probe gateway-no-client-cert --cacert $T/ca.crt https://seaweedfs-s3:8443/
for url in seaweedfs-master:9333/cluster/status seaweedfs-volume:8080/healthz seaweedfs-filer:8888/; do
  node=\${url%%/*}
  probe "http-plaintext-$node" http://$url
  probe "https-no-client-cert-$node" --cacert $T/ca.crt https://$url
  probe "https-mutual-$node" --cacert $T/ca.crt --cert $T/tls.crt --key $T/tls.key https://$url
done
for node in seaweedfs-master:19333 seaweedfs-volume:18080 seaweedfs-filer:18888 seaweedfs-s3:18333; do
  probe "grpc-plaintext-$node" --http2-prior-knowledge http://$node/
done
`;

/**
 * What the probes found wrong. A probe counts as accepted when curl completed and the server did
 * not answer 400 (the reply of an HTTPS server to a plaintext request).
 * @param {string} probeOutput
 * @returns {string[]}
 */
export function storageTlsFailures(probeOutput) {
  const results = new Map(
    probeOutput
      .trim()
      .split("\n")
      .map((line) => line.trim().split(" "))
      .map(([name, exit, code]) => [name, { code, exit: Number(exit) }]),
  );
  const accepted = (name) => results.get(name)?.exit === 0 && results.get(name)?.code !== "400";
  const failures = [];
  if (!accepted("gateway-https")) {
    failures.push("the S3 gateway HTTPS listener is not reachable with the storage CA");
  }
  if (accepted("gateway-untrusted")) {
    failures.push("the S3 gateway HTTPS listener passed verification without the storage CA");
  }
  if (accepted("gateway-no-client-cert")) {
    failures.push("the S3 gateway accepted HTTPS without a client certificate");
  }
  for (const node of HTTP_NODES) {
    if (accepted(`http-plaintext-${node}`)) {
      failures.push(`${node} answered plaintext HTTP`);
    }
    if (accepted(`https-no-client-cert-${node}`)) {
      failures.push(`${node} accepted HTTPS without a client certificate`);
    }
    if (!accepted(`https-mutual-${node}`)) {
      failures.push(`${node} refused the cluster certificate`);
    }
  }
  for (const node of GRPC_NODES) {
    if (accepted(`grpc-plaintext-${node}`)) {
      failures.push(`${node} answered plaintext gRPC`);
    }
  }
  return failures;
}

/**
 * Object storage is mutual TLS (docs/deploy/configuration.mdx#object-storage-tls):
 * - the API reached the gateway over HTTPS with the storage CA and its own client certificate
 *   (its boot report says so);
 * - the gateway's HTTPS listener verifies against the storage CA and nothing else, and refuses a
 *   client without a certificate;
 * - every node refuses plaintext HTTP and HTTPS without a client certificate, and accepts the
 *   cluster certificate;
 * - no gRPC port answers plaintext.
 */
export function assertStorageTls({ compose, fail }) {
  const logs = compose("logs --no-color api");
  const report = (logs.stdout ?? "")
    .split("\n")
    .find((line) => line.includes("Object storage connection security"));
  if (
    !(
      report?.includes('"tls":true') &&
      report.includes('"privateCa":true') &&
      report.includes('"mutualTls":true')
    )
  ) {
    fail(
      "The API did not report a TLS connection to object storage with the storage CA and its client certificate",
      report,
    );
  }

  const probes = compose("exec -T seaweedfs-s3 sh -s", STORAGE_TLS_PROBES);
  const failures = storageTlsFailures(probes.stdout ?? "");
  if (failures.length > 0) {
    fail(
      `Object storage TLS: ${failures.join("; ")}`,
      `${probes.stdout ?? ""}${probes.stderr ?? ""}`,
    );
  }

  console.log(
    "Object storage mutual TLS: API and Traefik present certificates; gateway and nodes refuse plaintext and unidentified clients",
  );
}

/**
 * Runs inside the webapp container (Node, no curl). Prints one JSON object with each probe's
 * outcome: `status <code>` or `error <code>`. This fresh Node process does not have the CA the
 * webapp server added to its trust store, which is the point of the `untrusted` probe.
 */
export const API_INTERNAL_TLS_PROBES = `
import { execFileSync } from "node:child_process";
const internal = new URL("/health/live", process.env.BONDERY_INFRA_INTERNAL_API_URL);
const plaintext = new URL(internal);
plaintext.protocol = "http:";
const probe = (url) =>
  fetch(url, { signal: AbortSignal.timeout(5000) }).then(
    (response) => \`status \${response.status}\`,
    (error) => \`error \${error.cause?.code ?? error.name}\`,
  );
const trustedCode = \`const r = await fetch(\${JSON.stringify(internal.href)}).then((x) => "status " + x.status, (e) => "error " + (e.cause?.code ?? e.name)); console.log(r);\`;
console.log(JSON.stringify({
  internalUrl: internal.origin,
  plaintext: await probe(plaintext),
  throughWebapp: await probe("http://127.0.0.1:26632/api/health/live"),
  trusted: execFileSync(process.execPath, ["--input-type=module", "-e", trustedCode], {
    encoding: "utf8",
    env: { ...process.env, NODE_EXTRA_CA_CERTS: process.env.BONDERY_INFRA_INTERNAL_API_CA_FILE },
  }).trim(),
  untrusted: await probe(internal),
}));
`;

/**
 * What the internal API TLS probes found wrong.
 * @param {{ internalUrl?: string; plaintext?: string; throughWebapp?: string; trusted?: string; untrusted?: string }} results
 * @returns {string[]}
 */
export function apiInternalTlsFailures(results) {
  const failures = [];
  if (!results.internalUrl?.startsWith("https://")) {
    failures.push(`the webapp's internal API URL is not https:// (${results.internalUrl})`);
  }
  if (results.throughWebapp !== "status 200") {
    failures.push(
      `the webapp could not reach the API over its internal URL (${results.throughWebapp})`,
    );
  }
  if (results.trusted !== "status 200") {
    failures.push(`the internal listener did not verify against the API CA (${results.trusted})`);
  }
  if (!results.untrusted?.startsWith("error")) {
    failures.push(
      `the internal listener passed verification without the API CA (${results.untrusted})`,
    );
  }
  if (results.plaintext?.startsWith("status 2")) {
    failures.push(`the internal listener answered plaintext HTTP (${results.plaintext})`);
  }
  return failures;
}

/**
 * The webapp calls the API over its internal HTTPS listener (docs/deploy/configuration.mdx#internal-api-tls):
 * - the API started the listener;
 * - a BFF route that proxies to the API succeeds, so the webapp server trusts the API CA;
 * - the listener verifies against the API CA only, and refuses plaintext.
 */
export function assertApiInternalTls({ compose, fail }) {
  const logs = compose("logs --no-color api");
  if (!(logs.stdout ?? "").includes("Bondery API running at https://")) {
    fail("The API did not start its HTTPS listener");
  }
  const probes = compose("exec -T webapp node --input-type=module -", API_INTERNAL_TLS_PROBES);
  const failures = apiInternalTlsFailures(parseLastJsonLine(probes.stdout ?? ""));
  if (failures.length > 0) {
    fail(
      `Internal API TLS: ${failures.join("; ")}`,
      `${probes.stdout ?? ""}${probes.stderr ?? ""}`,
    );
  }
  console.log(
    "Internal API TLS: webapp reaches the API over HTTPS; plaintext and untrusted refused",
  );
}

/**
 * Runs inside the api container. Prints one JSON object: `status <code>` or `error <code>` for
 * HTTPS with the API CA, and for plaintext on the same port, which must be refused.
 */
export const API_HTTPS_ONLY_PROBES = `
import { readFileSync } from "node:fs";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
const ca = readFileSync("/bondery-api/client/ca.crt", "utf8");
const probe = (send, options) =>
  new Promise((resolve) => {
    const req = send({ host: "127.0.0.1", path: "/health/live", timeout: 5000, ...options }, (res) => {
      res.resume();
      resolve(\`status \${res.statusCode}\`);
    });
    req.on("timeout", () => req.destroy(Object.assign(new Error("timeout"), { code: "TIMEOUT" })));
    req.on("error", (error) => resolve(\`error \${error.code ?? error.message}\`));
    req.end();
  });
console.log(JSON.stringify({
  https: await probe(httpsRequest, { agent: false, ca, port: 26631 }),
  plaintextOnHttpsPort: await probe(httpRequest, { agent: false, port: 26631 }),
}));
`;

/**
 * What the HTTPS-only probes found wrong.
 * @param {{ https?: string; plaintextOnHttpsPort?: string }} results
 * @returns {string[]}
 */
export function apiHttpsOnlyFailures(results) {
  const failures = [];
  if (results.https !== "status 200") {
    failures.push(`HTTPS with the API CA did not answer 200 (${results.https})`);
  }
  if (!results.plaintextOnHttpsPort?.startsWith("error")) {
    failures.push(`the HTTPS port answered plaintext HTTP (${results.plaintextOnHttpsPort})`);
  }
  return failures;
}

/**
 * The API serves HTTPS only (docs/adr/0031-internal-api-tls.mdx):
 * - the container healthcheck, which also uses HTTPS and the API CA, reports healthy;
 * - HTTPS with the API CA answers; plaintext on the same port is refused.
 */
export function assertApiHttpsOnly({ compose, fail }) {
  let health = apiHealth(compose);
  // The healthcheck runs every 30 s after a 45 s start period.
  for (let attempt = 0; attempt < 30 && health !== "healthy" && health !== "unhealthy"; attempt++) {
    pause(3000);
    health = apiHealth(compose);
  }
  if (health !== "healthy") {
    fail(
      `The api healthcheck (HTTPS with the API CA) did not report healthy (${health || "none"})`,
    );
  }
  const probes = compose("exec -T api node --input-type=module -", API_HTTPS_ONLY_PROBES);
  const failures = apiHttpsOnlyFailures(parseLastJsonLine(probes.stdout ?? ""));
  if (failures.length > 0) {
    fail(`API HTTPS only: ${failures.join("; ")}`, `${probes.stdout ?? ""}${probes.stderr ?? ""}`);
  }
  console.log("API HTTPS only: healthcheck healthy over HTTPS; plaintext refused on the API port");
}

/**
 * The services the traefik-transport job publishes a serversTransport for, and how a client that
 * trusts only the published CA proves it verifies that service: the port of its HTTPS listener,
 * a path, and the answers that mean "reached the service". The storage gateway also requires a
 * client certificate, so the probe presents the API's own certificate from its mounted volume.
 */
export const TRAEFIK_TRANSPORTS = {
  api: { accepted: ["status 200"], path: "/health/live", port: 26_631 },
  // Unsigned ListBuckets: 403 with S3 Error XML is the gateway speaking S3.
  storage: {
    accepted: ["status 200", "status 403"],
    clientCertificate: {
      cert: "/bondery-storage/client/tls.crt",
      key: "/bondery-storage/client/tls.key",
    },
    path: "/",
    port: 8443,
  },
};

/**
 * What a published serversTransport file gets wrong for `name` (<prefix>-<service>). Returns the
 * CA it holds too. A service whose gateway requires a client certificate must carry one.
 * @param {string} yaml
 * @param {string} name
 * @param {{ clientCertificate?: unknown }} [check]
 */
export function traefikTransportFailures(yaml, name, check = {}) {
  const failures = [];
  if (!new RegExp(`^ {4}${name}:$`, "m").test(yaml)) {
    failures.push(`no serversTransport named ${name}`);
  }
  if (!new RegExp(`^ {6}serverName: ${name}$`, "m").test(yaml)) {
    failures.push(`serverName is not ${name}`);
  }
  if (check.clientCertificate) {
    // Data bytes, not a path: Traefik does not mount the Bondery volumes.
    if (!TRANSPORT_CLIENT_CERTS_RE.test(yaml)) {
      failures.push(`${name} transport has no client certificate, but its gateway requires one`);
    }
    if (!TRANSPORT_CLIENT_KEY_RE.test(yaml) || !TRANSPORT_PRIVATE_KEY_RE.test(yaml)) {
      failures.push(`${name} transport has no inline client private key`);
    }
  }
  // The CA is the block after `rootCAs:`. Reading from there keeps it distinct from the client
  // certificate, which is also an inline PEM block.
  const rootCas = yaml.split(TRANSPORT_ROOT_CAS_RE)[1] ?? "";
  const ca = (rootCas.match(INLINE_PEM_CERT_RE) ?? [""])[0]
    .split("\n")
    .map((line) => line.replace(LEADING_TEN_SPACES_RE, ""))
    .join("\n");
  if (!ca) {
    failures.push(`no inline CA certificate in rootCAs of ${name}`);
  }
  return { ca, failures };
}

/**
 * The traefik-transport job published a serversTransport per service (docs/deploy/configuration.mdx#internal-api-tls):
 * - `<prefix>-api-transport.yml` and `<prefix>-storage-transport.yml`, each with the stack's
 *   serverName and its CA inline, and nothing else;
 * - each CA verifies that service's HTTPS listener under that name, which is what Traefik checks.
 * @param {{ compose: Function; fail: Function; dynamicDir: string }} context
 */
export function assertTraefikTransport({ compose, fail, dynamicDir }) {
  const files = readdirSync(dynamicDir).filter((name) => name.endsWith("-transport.yml"));
  const apiFile = files.find((name) => name.endsWith("-api-transport.yml"));
  if (!apiFile || files.length !== Object.keys(TRAEFIK_TRANSPORTS).length) {
    fail(
      `Expected the api and storage serversTransport files, found: ${files.join(", ") || "none"}`,
    );
    return;
  }
  const prefix = apiFile.replace(API_TRANSPORT_FILE_RE, "");
  for (const [service, check] of Object.entries(TRAEFIK_TRANSPORTS)) {
    const name = `${prefix}-${service}`;
    const file = `${name}-transport.yml`;
    if (!files.includes(file)) {
      fail(`The traefik-transport job did not publish ${file}`);
      return;
    }
    const yaml = readFileSync(join(dynamicDir, file), "utf8");
    const { ca, failures } = traefikTransportFailures(yaml, name, check);
    if (failures.length > 0) {
      fail(`Traefik serversTransport: ${failures.join("; ")}`, yaml);
      return;
    }
    const probe = compose(
      "exec -T api node --input-type=module -",
      TRANSPORT_CA_PROBE(name, check.port, check.path, ca, check.clientCertificate),
    );
    const outcome = (probe.stdout ?? "").trim();
    if (!check.accepted.includes(outcome)) {
      fail(
        `The published CA does not verify ${name}'s HTTPS listener (${outcome})`,
        `${probe.stdout ?? ""}${probe.stderr ?? ""}`,
      );
      return;
    }
    console.log(`Traefik serversTransport: ${name} verifies its HTTPS listener (${outcome})`);
  }
}

/**
 * Postgres is TLS-only (docs/deploy/configuration.mdx#postgres-tls):
 * - every client backend the stack opened (API pool, pg-boss) uses TLS 1.2 or newer;
 * - a plaintext TCP connection is refused by the hba file;
 * - a client that does not trust the stack CA cannot connect.
 */
export function assertPostgresTls({ compose, fail }) {
  const output = (result) => `${result.stdout ?? ""}${result.stderr ?? ""}`;
  /** psql inside the db container. TCP to localhost there is subject to the TLS rule. */
  const dbPsql = (connection, sql) =>
    compose(
      `exec -T db sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" psql "${connection}" -Atc "${sql}"'`,
    );

  const sessions = compose(
    `exec -T db psql -U postgres -d bondery -Atc "select count(*) filter (where not s.ssl or s.version not in ('TLSv1.2', 'TLSv1.3')), count(*) from pg_stat_activity a join pg_stat_ssl s using (pid) where a.backend_type = 'client backend' and a.client_addr is not null"`,
  );
  const [insecure, total] = (sessions.stdout ?? "").trim().split("|").map(Number);
  if (sessions.status !== 0 || !(total > 0) || insecure !== 0) {
    fail(
      `Postgres client connections over TCP: ${total} total, ${insecure} without TLS 1.2+`,
      output(sessions),
    );
  }

  const plaintext = dbPsql(
    "host=localhost user=postgres dbname=bondery sslmode=disable connect_timeout=5",
    "select 1",
  );
  if (plaintext.status === 0 || !POSTGRES_NO_ENCRYPTION_RE.test(output(plaintext))) {
    fail("Postgres accepted a plaintext TCP connection", output(plaintext));
  }

  const untrusted = dbPsql(
    "host=localhost user=postgres dbname=bondery sslmode=verify-full sslrootcert=/etc/ssl/certs/ca-certificates.crt connect_timeout=5",
    "select 1",
  );
  // A refusal for any other reason (a broken command, a wrong password) proves nothing here.
  if (untrusted.status === 0 || !POSTGRES_CERT_VERIFY_FAILED_RE.test(output(untrusted))) {
    fail(
      "Postgres did not refuse a client that does not trust the stack CA with a certificate error",
      output(untrusted),
    );
  }

  console.log(
    `Postgres TLS: ${total} client connections on TLS; plaintext and untrusted CA refused`,
  );
}

/**
 * Bundled Redis requires mutual TLS (docs/adr/0032-redis-mtls.mdx):
 * - redis-cli with the healthcheck client certificate, CA, and password must answer PONG;
 * - the same command without a client certificate must fail;
 * - a plaintext ping must fail;
 * - a client certificate the Redis CA did not sign must fail when openssl is available.
 */
export function assertRedisMutualTls({ compose, fail }) {
  const output = shellOutput;

  const withCert = compose(
    `exec -T redis sh -c 'REDISCLI_AUTH="$(cat /bondery-redis/server/password)" redis-cli --tls --cert /bondery-redis/server/healthcheck.crt --key /bondery-redis/server/healthcheck.key --cacert /bondery-redis/server/ca.crt -h localhost -p 6379 ping'`,
  );
  if (!answeredPong(withCert)) {
    fail("Redis did not answer PONG with the healthcheck client certificate", output(withCert));
  }

  const withoutCert = compose(
    `exec -T redis sh -c 'REDISCLI_AUTH="$(cat /bondery-redis/server/password)" redis-cli --tls --cacert /bondery-redis/server/ca.crt -h localhost -p 6379 ping'`,
  );
  if (answeredPong(withoutCert)) {
    fail("Redis accepted a TLS connection without a client certificate", output(withoutCert));
  }

  const plaintext = compose(`exec -T redis sh -c 'redis-cli -h localhost -p 6379 ping'`);
  if (answeredPong(plaintext)) {
    fail("Redis answered a plaintext ping", output(plaintext));
  }

  assertRedisUntrustedClientCert({ compose, fail }, output);
  console.log("Redis mutual TLS: healthcheck cert accepted; plaintext and password-only refused");
}
