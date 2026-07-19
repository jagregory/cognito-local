import { describe, expect, it } from "vitest";
import { ClockFake } from "../__tests__/clockFake";
import { InMemorySessionService } from "./sessionService";

const now = new Date("2025-01-01T00:00:00.000Z");
const session = {
  clientId: "client",
  purpose: "MFA_SETUP" as const,
  userPoolId: "pool",
  username: "user",
};

describe("InMemorySessionService", () => {
  it("creates and retrieves a session with a three-minute expiry", () => {
    const sessions = new InMemorySessionService(new ClockFake(now));

    const id = sessions.create(session);

    expect(sessions.get(id)).toEqual({
      ...session,
      expiresAt: now.getTime() + 3 * 60 * 1000,
    });
  });

  it("lazily removes expired sessions", () => {
    const clock = new ClockFake(now);
    const sessions = new InMemorySessionService(clock);
    const id = sessions.create(session);

    clock.advanceBy(3 * 60 * 1000);

    expect(sessions.get(id)).toBeNull();
    expect(sessions.consume(id)).toBeNull();
  });

  it("rotates a session and refreshes its expiry", () => {
    const clock = new ClockFake(now);
    const sessions = new InMemorySessionService(clock);
    const oldId = sessions.create(session);
    clock.advanceBy(30_000);

    const newId = sessions.rotate(oldId);

    expect(newId).not.toBeNull();
    expect(sessions.get(oldId)).toBeNull();
    expect(sessions.get(newId as string)).toEqual({
      ...session,
      expiresAt: clock.get().getTime() + 3 * 60 * 1000,
    });
  });

  it("consumes a session only once", () => {
    const sessions = new InMemorySessionService(new ClockFake(now));
    const id = sessions.create(session);

    expect(sessions.consume(id)).toEqual({
      ...session,
      expiresAt: now.getTime() + 3 * 60 * 1000,
    });
    expect(sessions.consume(id)).toBeNull();
  });
});
