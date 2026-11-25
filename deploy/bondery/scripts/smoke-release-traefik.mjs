/**
 * Real-Traefik assertions for the release smoke (smoke-release.mjs).
 *
 * The smoke runs a Traefik container with the same file provider and mount path as Dokploy's, and
 * sends requests through it. A request that reaches the API and the storage gateway proves what
 * production needs: Traefik loaded each serversTransport, resolved the certificate paths, verified
 * the private CA, and presented the client certificate. Reading the YAML the job wrote proves none
 * of that, and an earlier version of this smoke asserted a design the job no longer used.
 *
 * Each assertion takes a context:
 * - docker(args, input?): runs `docker <args>` and returns the spawnSync result (utf8);
 * - fail(message, output?): reports the failure and stops the smoke (it throws).
 */
import { spawnSync } from "node:child_process";

/**
 * Dokploy's own default (`TRAEFIK_VERSION` in packages/server/src/setup/traefik-setup.ts at the
 * time of writing). The smoke must run the Traefik that production runs: transport handling
 * differs between minor versions. Bump this with Dokploy.
 */
const TRAEFIK_IMAGE = "traefik:v3.7.19";
const TRAEFIK_CONTAINER = "bondery-smoke-traefik";
/** The folder Dokploy mounts for Traefik's file provider. The transport files name paths in it. */
const TRAEFIK_VIEW_DIR = "/etc/dokploy/traefik/dynamic";
/** Host ports for the smoke's Traefik, bound to loopback only. */
const TRAEFIK_HTTPS_PORT = 18_443;
const TRAEFIK_API_PORT = 18_080;
/** Busybox image that reads and removes files the root-run job created. */
const ROOT_HELPER_IMAGE = "busybox:1.37";

const INLINE_CLIENT_CERT_RE = /^\s+(?:- )?cert: \||^\s+key: \|/m;
const NEWLINE_RE = /\r?\n/;
const API_TRANSPORT_FILE_RE = /-api-transport\.yml$/;
const SERVERS_TRANSPORTS_PATH = "/api/http/serverstransports";

/**
 * Docker arguments that start Traefik the way Dokploy does: the file provider on the dynamic
 * folder, the Docker provider on `dokploy-network`, and the `web` and `websecure` entry points.
 * Routers in the compose file name a `letsencrypt` resolver, so one must exist or Traefik drops
 * them. Its CA server is a closed local port: the smoke must never reach Let's Encrypt.
 *
 * @param {{ dynamicDir: string; network?: string }} options
 * @returns {string[]}
 */
function traefikRunArgs({ dynamicDir, network = "dokploy-network" }) {
  return [
    "run",
    "-d",
    "--name",
    TRAEFIK_CONTAINER,
    "--network",
    network,
    "-p",
    `127.0.0.1:${TRAEFIK_HTTPS_PORT}:443`,
    "-p",
    `127.0.0.1:${TRAEFIK_API_PORT}:8080`,
    "-v",
    `${dynamicDir}:${TRAEFIK_VIEW_DIR}:ro`,
    "-v",
    "/var/run/docker.sock:/var/run/docker.sock",
    TRAEFIK_IMAGE,
    `--providers.file.directory=${TRAEFIK_VIEW_DIR}`,
    "--providers.file.watch=true",
    "--providers.docker=true",
    "--providers.docker.exposedByDefault=false",
    `--providers.docker.network=${network}`,
    "--entryPoints.web.address=:80",
    "--entryPoints.websecure.address=:443",
    "--certificatesResolvers.letsencrypt.acme.email=smoke@example.test",
    "--certificatesResolvers.letsencrypt.acme.storage=/tmp/acme.json",
    "--certificatesResolvers.letsencrypt.acme.tlsChallenge=true",
    "--certificatesResolvers.letsencrypt.acme.caServer=https://127.0.0.1:1/directory",
    "--api.insecure=true",
    "--log.level=DEBUG",
  ];
}

/**
 * What a published serversTransport file gets wrong. This is a cheap sanity check that names the
 * likely cause when the behavioural check below fails; it is not the proof.
 * - the transport has the stack's name and server name;
 * - a service whose gateway needs a client certificate references the pair by path under
 *   `<viewDir>/certificates/<prefix>/`, because a serversTransport has no inline `cert` field.
 *
 * @param {string} yaml
 * @param {{ name: string; prefix: string; service: string; viewDir?: string; clientCertificate: boolean }} check
 * @returns {string[]}
 */
function traefikTransportFailures(yaml, check) {
  const { name, prefix, service, clientCertificate, viewDir = TRAEFIK_VIEW_DIR } = check;
  const failures = [];
  if (!new RegExp(`^ {4}${name}:$`, "m").test(yaml)) {
    failures.push(`no serversTransport named ${name}`);
  }
  if (!new RegExp(`^ {6}serverName: ${name}$`, "m").test(yaml)) {
    failures.push(`serverName is not ${name}`);
  }
  if (INLINE_CLIENT_CERT_RE.test(yaml)) {
    failures.push(`${name} transport inlines a client certificate, which Traefik rejects`);
  }
  if (clientCertificate) {
    const dir = `${viewDir}/certificates/${prefix}`;
    if (!yaml.includes(`certFile: ${dir}/${service}-client.crt`)) {
      failures.push(`${name} transport does not reference ${dir}/${service}-client.crt`);
    }
    if (!yaml.includes(`keyFile: ${dir}/${service}-client.key`)) {
      failures.push(`${name} transport does not reference ${dir}/${service}-client.key`);
    }
  }
  return failures;
}

/**
 * What an answer through Traefik must look like. The API answers its liveness probe. The storage
 * gateway gets an unsigned ListBuckets, and 403 with S3 Error XML is the gateway speaking S3: it
 * proves Traefik presented a client certificate the gateway accepted.
 */
const TRAEFIK_ROUTES = {
  api: {
    accepts: ({ status }) => status === 200,
    expected: "HTTP 200",
    path: "/health/live",
  },
  storage: {
    accepts: ({ status, body }) =>
      (status === 200 && body.includes("ListAllMyBucketsResult")) ||
      (status === 403 && body.includes("<Error")),
    expected: "HTTP 200 ListAllMyBucketsResult or HTTP 403 S3 Error XML",
    path: "/",
  },
};

/**
 * One request through the smoke's Traefik, for `host`.
 * @param {string} host
 * @param {string} path
 * @returns {{ status: number; body: string; error: string }}
 */
function requestThroughTraefik(host, path) {
  const result = spawnSync(
    "curl",
    [
      "-sk",
      "--max-time",
      "8",
      "--resolve",
      `${host}:${TRAEFIK_HTTPS_PORT}:127.0.0.1`,
      "-w",
      "\n%{http_code}",
      `https://${host}:${TRAEFIK_HTTPS_PORT}${path}`,
    ],
    { encoding: "utf8" },
  );
  const out = result.stdout ?? "";
  const split = out.lastIndexOf("\n");
  return {
    body: split === -1 ? "" : out.slice(0, split),
    error: result.status === 0 ? "" : (result.stderr ?? "").trim() || `curl exit ${result.status}`,
    status: Number(split === -1 ? 0 : out.slice(split + 1)),
  };
}

/** Blocks the smoke for `ms` milliseconds. */
function pause(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * Reads a file of the dynamic folder through a throwaway root container: the job wrote it as
 * root, so the runner user cannot be relied on to read it.
 * @param {(args: string[]) => { status: number | null; stdout?: string }} docker
 * @param {string} dynamicDir
 * @param {string} relativePath
 * @returns {string | null} the file text, or null when it cannot be read
 */
function readDynamicFile(docker, dynamicDir, relativePath) {
  const result = docker([
    "run",
    "--rm",
    "-v",
    `${dynamicDir}:/d:ro`,
    ROOT_HELPER_IMAGE,
    "cat",
    `/d/${relativePath}`,
  ]);
  return result.status === 0 ? (result.stdout ?? "") : null;
}

/** Diagnostics for a failed Traefik assertion: what it loaded, and what it logged. */
function traefikDiagnostics(docker) {
  const api = (path) =>
    spawnSync("curl", ["-s", "--max-time", "5", `http://127.0.0.1:${TRAEFIK_API_PORT}${path}`], {
      encoding: "utf8",
    }).stdout ?? "";
  const logs = docker(["logs", "--tail", "150", TRAEFIK_CONTAINER]);
  return [
    `serversTransports: ${api(SERVERS_TRANSPORTS_PATH)}`,
    `routers: ${api("/api/http/routers")}`,
    `services: ${api("/api/http/services")}`,
    `traefik logs:\n${logs.stdout ?? ""}${logs.stderr ?? ""}`,
  ].join("\n");
}

/** Starts the smoke's Traefik. Fails when it does not start. */
function startTraefik({ docker, fail, dynamicDir, network }) {
  docker(["rm", "-f", TRAEFIK_CONTAINER]);
  const started = docker(traefikRunArgs({ dynamicDir, network }));
  if (started.status !== 0) {
    fail(
      `Could not start ${TRAEFIK_IMAGE} for the smoke`,
      `${started.stdout ?? ""}${started.stderr ?? ""}`,
    );
  }
}

/** Removes the smoke's Traefik. Never fails: teardown must finish. */
function stopTraefik(docker) {
  docker(["rm", "-f", TRAEFIK_CONTAINER]);
}

/** Sanity check: each transport file exists and names what Traefik needs. */
function assertTransportFiles({ docker, fail, dynamicDir }) {
  const listing = docker([
    "run",
    "--rm",
    "-v",
    `${dynamicDir}:/d:ro`,
    ROOT_HELPER_IMAGE,
    "ls",
    "/d",
  ]);
  const apiFile = (listing.stdout ?? "")
    .split(NEWLINE_RE)
    .find((name) => name.endsWith("-api-transport.yml"));
  if (!apiFile) {
    fail("The traefik-transport job published no api serversTransport", listing.stdout);
  }
  const prefix = apiFile.replace(API_TRANSPORT_FILE_RE, "");

  for (const service of Object.keys(TRAEFIK_ROUTES)) {
    const name = `${prefix}-${service}`;
    const file = `${name}-transport.yml`;
    const yaml = readDynamicFile(docker, dynamicDir, file);
    if (yaml === null) {
      fail(`The traefik-transport job did not publish ${file}`);
    }
    const failures = traefikTransportFailures(yaml, {
      clientCertificate: service === "storage",
      name,
      prefix,
      service,
    });
    if (failures.length > 0) {
      fail(`Traefik serversTransport: ${failures.join("; ")}`, yaml);
    }
  }
}

/** One request for `service` through Traefik, retried while Traefik loads its configuration. */
function assertRouteAnswers({ docker, fail, host, service }) {
  const route = TRAEFIK_ROUTES[service];
  let answer = { body: "", error: "no attempt", status: 0 };
  for (let attempt = 0; attempt < 30 && !route.accepts(answer); attempt++) {
    if (attempt > 0) {
      pause(2000);
    }
    answer = requestThroughTraefik(host, route.path);
  }
  if (!route.accepts(answer)) {
    fail(
      `Traefik did not forward ${host}${route.path} to ${service} (wanted ${route.expected}; got HTTP ${answer.status} ${answer.error})`,
      [answer.body, traefikDiagnostics(docker)].join("\n"),
    );
  }
  console.log(
    `Traefik routing: ${host}${route.path} answered HTTP ${answer.status} through Traefik`,
  );
}

/**
 * Traefik routes the release's public domains to the containers over verified HTTPS
 * (docs/deploy/configuration.mdx#internal-api-tls):
 * - the job published `<prefix>-api-transport.yml` and `<prefix>-storage-transport.yml`, and the
 *   storage client pair under `certificates/<prefix>/` (a sanity check, to name the cause);
 * - a real Traefik, on the same file provider and mount path as Dokploy's, forwards a request for
 *   each domain and the service answers. That is the proof that it loaded the transports.
 *
 * @param {{ docker: Function; fail: Function; dynamicDir: string; domains: { api: string; storage: string }; network?: string }} context
 */
function assertTraefikRouting({ docker, fail, dynamicDir, domains, network }) {
  assertTransportFiles({ docker, dynamicDir, fail });
  startTraefik({ docker, dynamicDir, fail, network });
  for (const service of Object.keys(TRAEFIK_ROUTES)) {
    assertRouteAnswers({ docker, fail, host: domains[service], service });
  }
}

export {
  assertTraefikRouting,
  ROOT_HELPER_IMAGE,
  readDynamicFile,
  requestThroughTraefik,
  startTraefik,
  stopTraefik,
  TRAEFIK_API_PORT,
  TRAEFIK_CONTAINER,
  TRAEFIK_HTTPS_PORT,
  TRAEFIK_IMAGE,
  TRAEFIK_ROUTES,
  TRAEFIK_VIEW_DIR,
  traefikRunArgs,
  traefikTransportFailures,
};
