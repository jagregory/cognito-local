import { v4 } from "uuid";
import type { Clock } from "./clock";

const SESSION_TTL_MS = 3 * 60 * 1000;

export interface AuthSession {
  clientId: string;
  userPoolId: string;
  username: string;
  purpose: "MFA_SETUP";
  expiresAt: number;
}

export interface SessionService {
  create(session: Omit<AuthSession, "expiresAt">): string;
  get(id: string): AuthSession | null;
  rotate(id: string): string | null;
  consume(id: string): AuthSession | null;
}

export class InMemorySessionService implements SessionService {
  private readonly sessions = new Map<string, AuthSession>();

  public constructor(private readonly clock: Clock) {}

  public create(session: Omit<AuthSession, "expiresAt">): string {
    const id = v4();
    this.sessions.set(id, {
      ...session,
      expiresAt: this.clock.get().getTime() + SESSION_TTL_MS,
    });
    return id;
  }

  public get(id: string): AuthSession | null {
    const session = this.sessions.get(id);
    if (!session) {
      return null;
    }

    if (session.expiresAt <= this.clock.get().getTime()) {
      this.sessions.delete(id);
      return null;
    }

    return session;
  }

  public rotate(id: string): string | null {
    const session = this.get(id);
    if (!session) {
      return null;
    }

    this.sessions.delete(id);
    return this.create({
      clientId: session.clientId,
      purpose: session.purpose,
      userPoolId: session.userPoolId,
      username: session.username,
    });
  }

  public consume(id: string): AuthSession | null {
    const session = this.get(id);
    if (!session) {
      return null;
    }

    this.sessions.delete(id);
    return session;
  }
}
