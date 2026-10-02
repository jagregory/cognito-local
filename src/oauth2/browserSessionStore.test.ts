import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ClockFake } from "../__tests__/clockFake";
import { BrowserSessionStore } from "./browserSessionStore";

describe("persisted browser sessions", () => {
  let directory: string;
  let file: string;
  let clock: ClockFake;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), "cognito-browser-sessions-"));
    file = join(directory, ".cognito/browser-sessions.json");
    clock = new ClockFake(new Date("2026-01-01T00:00:00Z"));
  });
  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it("survives restart with private permissions and no raw cookie, password or token", async () => {
    const store = await BrowserSessionStore.load(clock, file);
    const session = await store.create("pool", "username", "subject");
    const saved = await readFile(file, "utf8");
    expect(saved).not.toContain(session.id);
    expect(Object.keys(JSON.parse(saved)[0][1]).sort()).toEqual([
      "expiresAt",
      "subject",
      "userPoolId",
      "username",
    ]);
    if (process.platform !== "win32")
      expect((await stat(file)).mode & 0o777).toBe(0o600);
    const restarted = await BrowserSessionStore.load(clock, file);
    expect(await restarted.get(session.id, "pool")).toMatchObject({
      username: "username",
      expiresAt: session.expiresAt,
    });
    await restarted.revoke(session.id, "pool");
    expect(
      await (await BrowserSessionStore.load(clock, file)).get(
        session.id,
        "pool",
      ),
    ).toBeNull();
  });

  it("expires exactly at one hour without renewal on reads or restarts", async () => {
    let store = await BrowserSessionStore.load(clock, file);
    const { id } = await store.create("pool", "user", "sub");
    clock.advanceBy(3_599_999);
    expect(await store.get(id, "pool")).not.toBeNull();
    store = await BrowserSessionStore.load(clock, file);
    expect(await store.get(id, "pool")).not.toBeNull();
    clock.advanceBy(1);
    expect(await store.get(id, "pool")).toBeNull();
    expect(
      await (await BrowserSessionStore.load(clock, file)).get(id, "pool"),
    ).toBeNull();
  });

  it("serializes concurrent writes, rotates only the current session and scopes revocation to its pool", async () => {
    const store = await BrowserSessionStore.load(clock, file);
    const [first, otherBrowser, otherPool] = await Promise.all([
      store.create("pool", "user", "sub"),
      store.create("pool", "user", "sub"),
      store.create("other", "user", "sub"),
    ]);
    clock.advanceBy(1000);
    const replacement = await store.create("pool", "user", "sub", first.id);
    await store.revoke(otherPool.id, "pool");
    const restarted = await BrowserSessionStore.load(clock, file);
    expect(await restarted.get(first.id, "pool")).toBeNull();
    for (const id of [replacement.id, otherBrowser.id])
      expect(await restarted.get(id, "pool")).not.toBeNull();
    expect(await restarted.get(otherPool.id, "other")).not.toBeNull();
    expect(replacement.expiresAt).toBe(first.expiresAt + 1000);
  });

  it("persists user-wide revocation across restart without affecting other users or pools", async () => {
    const store = await BrowserSessionStore.load(clock, file);
    const [first, second, other, otherPool] = await Promise.all([
      store.create("pool", "user", "sub"),
      store.create("pool", "user", "sub"),
      store.create("pool", "other", "sub-2"),
      store.create("other-pool", "user", "sub"),
    ]);
    await store.revokeUser("pool", "user");
    const restarted = await BrowserSessionStore.load(clock, file);
    for (const session of [first, second])
      expect(await restarted.get(session.id, "pool")).toBeNull();
    expect(await restarted.get(other.id, "pool")).not.toBeNull();
    expect(await restarted.get(otherPool.id, "other-pool")).not.toBeNull();
  });

  it("keeps sessions in memory if durable revocation fails", async () => {
    const store = await BrowserSessionStore.load(clock, file);
    const session = await store.create("pool", "user", "sub");
    await rm(file);
    await mkdir(file);
    await expect(store.revokeMany([session.id], "pool")).rejects.toThrow();
    expect(await store.get(session.id, "pool")).not.toBeNull();
  });

  it("rejects corrupted stores instead of authenticating from partial data", async () => {
    await writeFile(join(directory, "bad.json"), '[ ["bad", {}] ]');
    await expect(
      BrowserSessionStore.load(clock, join(directory, "bad.json")),
    ).rejects.toThrow("Invalid browser session store");
  });

  it("does not establish an in-memory session when persistence fails", async () => {
    const invalidFile = join(directory, "not-a-directory");
    await writeFile(invalidFile, "file");
    const store = new BrowserSessionStore(
      clock,
      join(invalidFile, "sessions.json"),
    );
    await expect(store.create("pool", "user", "sub")).rejects.toThrow();
  });
});
