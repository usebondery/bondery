import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, afterEach, beforeEach, mock } from "node:test";
import { prisma } from "@bondery/db";
import { createContact } from "../../domains/contacts/create-contact.js";
import { loadTestEnv } from "../../test/load-test-env.js";
import { createMemoryStorage } from "../../test/memory-storage.js";
import { provisionNewUser } from "../auth/provision-new-user.js";
import { resetStorageForTests, setStorageForTests } from "../storage/get-storage.js";
import { reconcileAddressBook } from "./reconcile.js";

loadTestEnv();

const userIds: string[] = [];

/** Registers the storage and cleanup hooks every CardDAV reconcile test file needs. */
function registerReconcileTestHooks(): void {
  beforeEach(() => {
    setStorageForTests(createMemoryStorage());
  });
  afterEach(() => {
    resetStorageForTests();
    mock.restoreAll();
  });
  after(async () => {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });
}

async function newUser() {
  const id = randomUUID();
  const email = `reconcile-${id}@example.test`;
  await prisma.user.create({ data: { email, id, name: "Reconcile" } });
  userIds.push(id);
  await provisionNewUser({ email, name: "Reconcile", userId: id });
  return { ctx: { user: { email, id } }, id };
}

type TestContext = Awaited<ReturnType<typeof newUser>>["ctx"];

async function addPeople(ctx: TestContext, count: number): Promise<string[]> {
  const ids: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const created = await createContact(ctx, { firstName: `Person${index}`, lastName: "Test" });
    ids.push(created.data.personId);
  }
  return ids;
}

async function cardOf(userId: string, personId: string) {
  return prisma.carddavCard.findFirstOrThrow({ where: { personId, userId } });
}

async function reconcileToEnd(userId: string, maxPersons?: number) {
  let calls = 0;
  for (;;) {
    calls += 1;
    const result = await reconcileAddressBook(userId, maxPersons ? { maxPersons } : {});
    if (result.done) {
      return calls;
    }
    assert.ok(calls < 50, "reconcile did not finish");
  }
}

async function readBook(userId: string) {
  return prisma.carddavAddressBook.findUniqueOrThrow({ where: { userId } });
}

export type { TestContext };
export { addPeople, cardOf, newUser, readBook, reconcileToEnd, registerReconcileTestHooks };
