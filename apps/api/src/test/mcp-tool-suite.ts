/**
 * Setup shared by the MCP tool isolation suites: one Fastify app, two users with `mcp:write`
 * tokens, and the OAuth rows cleaned up afterwards.
 */
import type { FastifyInstance } from "fastify";
import { loadTestEnv } from "./load-test-env.js";

loadTestEnv();

const { createTestApp } = await import("./create-test-app.js");
const { prisma } = await import("@bondery/db");
const { upsertMcpResources } = await import("../lib/bootstrap/provision-oauth-clients.js");
const {
  CIMD_DISCOVERY_ID,
  MCP_READ_SCOPE,
  createNativeSession,
  createTestUser,
  deleteOAuthClientsAndUsers,
  mintMcpToken,
  upsertMcpPublicClient,
} = await import("./mcp-test-harness.js");

export { prisma };

export interface ToolSuite {
  app: FastifyInstance;
  createdUserIds: string[];
  readTokenFor: (session: string) => Promise<string>;
  twoUsers: () => Promise<{
    otherId: string;
    otherSession: string;
    otherToken: string;
    ownerId: string;
    ownerSession: string;
    ownerToken: string;
  }>;
}

/** Create the app, provision the MCP client, and return helpers bound to that app. */
export async function createToolSuite(clientId: string): Promise<ToolSuite> {
  await upsertMcpResources();
  await upsertMcpPublicClient(clientId, CIMD_DISCOVERY_ID);
  const app = await createTestApp();
  const createdUserIds: string[] = [];

  async function twoUsers() {
    const owner = await createTestUser("MCP Tools");
    const other = await createTestUser("MCP Tools");
    createdUserIds.push(owner.id, other.id);
    const ownerSession = await createNativeSession(owner.id);
    const otherSession = await createNativeSession(other.id);
    const ownerToken = await mintMcpToken(app, ownerSession, clientId);
    const otherToken = await mintMcpToken(app, otherSession, clientId);
    return {
      otherId: other.id,
      otherSession,
      otherToken,
      ownerId: owner.id,
      ownerSession,
      ownerToken,
    };
  }

  return {
    app,
    createdUserIds,
    readTokenFor: (session) => mintMcpToken(app, session, clientId, { scope: MCP_READ_SCOPE }),
    twoUsers,
  };
}

export async function closeToolSuite(suite: ToolSuite, clientIds: string[]): Promise<void> {
  await suite.app.close();
  await deleteOAuthClientsAndUsers(clientIds, suite.createdUserIds);
}
