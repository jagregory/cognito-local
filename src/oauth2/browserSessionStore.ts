import { createHash, randomBytes } from "node:crypto";
import {
  chmod,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname } from "node:path";
import { type Clock, DateClock } from "../services/clock";

const LIFETIME_MS = 60 * 60 * 1000;
const digest = (id: string) => createHash("sha256").update(id).digest("hex");

interface BrowserSession {
  userPoolId: string;
  username: string;
  subject: string;
  expiresAt: number;
}

/** One process owns the file, just like the emulator's user-pool database. */
export class BrowserSessionStore {
  private sessions = new Map<string, BrowserSession>();
  private writes: Promise<void> = Promise.resolve();
  private readonly users = new Map<string, Promise<void>>();

  constructor(
    private readonly clock: Clock = new DateClock(),
    private readonly filePath?: string,
  ) {}

  static async load(
    clock: Clock,
    filePath: string,
  ): Promise<BrowserSessionStore> {
    const store = new BrowserSessionStore(clock, filePath);
    let data: unknown;
    try {
      data = JSON.parse(await readFile(filePath, "utf8"));
      await chmod(filePath, 0o600);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return store;
      throw error;
    }
    if (!Array.isArray(data)) throw new Error("Invalid browser session store");
    for (const entry of data) {
      if (
        !Array.isArray(entry) ||
        entry.length !== 2 ||
        typeof entry[0] !== "string" ||
        !/^[a-f0-9]{64}$/.test(entry[0]) ||
        !entry[1] ||
        typeof entry[1].userPoolId !== "string" ||
        typeof entry[1].username !== "string" ||
        typeof entry[1].subject !== "string" ||
        !Number.isFinite(entry[1].expiresAt)
      )
        throw new Error("Invalid browser session store");
      if (entry[1].expiresAt > clock.get().getTime())
        store.sessions.set(entry[0], entry[1]);
    }
    return store;
  }

  async get(
    id: string | undefined,
    userPoolId: string,
  ): Promise<BrowserSession | null> {
    await this.writes;
    if (!id || !/^[A-Za-z0-9_-]{43}$/.test(id)) return null;
    const session = this.sessions.get(digest(id));
    return session?.userPoolId === userPoolId &&
      session.expiresAt > this.clock.get().getTime()
      ? { ...session }
      : null;
  }

  async create(
    userPoolId: string,
    username: string,
    subject: string,
    previousId?: string,
  ) {
    const id = randomBytes(32).toString("base64url");
    const session = {
      userPoolId,
      username,
      subject,
      expiresAt: this.clock.get().getTime() + LIFETIME_MS,
    };
    await this.update((sessions) => {
      if (
        previousId &&
        sessions.get(digest(previousId))?.userPoolId === userPoolId
      ) {
        sessions.delete(digest(previousId));
      }
      sessions.set(digest(id), session);
    });
    return { id, expiresAt: session.expiresAt };
  }

  async revoke(id: string | undefined, userPoolId: string): Promise<void> {
    return this.revokeMany(id ? [id] : [], userPoolId);
  }

  async revokeMany(ids: readonly string[], userPoolId: string): Promise<void> {
    if (!ids.length) return;
    await this.update((sessions) => {
      for (const id of ids) {
        if (sessions.get(digest(id))?.userPoolId === userPoolId)
          sessions.delete(digest(id));
      }
    });
  }

  async revokeUser(userPoolId: string, username: string): Promise<void> {
    await this.update((sessions) => {
      for (const [id, session] of sessions) {
        if (session.userPoolId === userPoolId && session.username === username)
          sessions.delete(id);
      }
    });
  }

  /** Serialize the user check with session issuance and administrative changes. */
  withUser<T>(
    userPoolId: string,
    username: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    const key = JSON.stringify([userPoolId, username]);
    const result = (this.users.get(key) ?? Promise.resolve()).then(operation);
    const settled = result.then(
      () => {},
      () => {},
    );
    this.users.set(key, settled);
    void settled.then(() => {
      if (this.users.get(key) === settled) this.users.delete(key);
    });
    return result;
  }

  private update(
    change: (sessions: Map<string, BrowserSession>) => void,
  ): Promise<void> {
    const result = this.writes.then(async () => {
      const sessions = new Map(
        [...this.sessions].filter(
          ([, session]) => session.expiresAt > this.clock.get().getTime(),
        ),
      );
      change(sessions);
      if (this.filePath) {
        await mkdir(dirname(this.filePath), { recursive: true });
        const temporary = `${this.filePath}.${randomBytes(12).toString("hex")}.tmp`;
        try {
          await writeFile(temporary, JSON.stringify([...sessions]), {
            mode: 0o600,
            flag: "wx",
          });
          await rename(temporary, this.filePath);
        } finally {
          await rm(temporary, { force: true });
        }
      }
      // A failed disk write must not establish or revoke an in-memory session.
      this.sessions = sessions;
    });
    this.writes = result.catch(() => {});
    return result;
  }
}

export const browserSessionCookieName = (userPoolId: string): string =>
  `cognito-local-session-${digest(userPoolId)}`;

export function readBrowserSessionCookie(
  header: string | undefined,
  userPoolId: string,
): string | undefined {
  const name = `${browserSessionCookieName(userPoolId)}=`;
  const matches =
    header
      ?.split(";")
      .map((part) => part.trim())
      .filter((part) => part.startsWith(name)) ?? [];
  // Duplicate cookies are ambiguous; never choose a caller-controlled ordering.
  return matches.length === 1 ? matches[0].slice(name.length) : undefined;
}

/** Logout revokes every presented ID, even when authentication is ambiguous. */
export function readBrowserSessionCookies(
  header: string | undefined,
  userPoolId: string,
): string[] {
  const name = `${browserSessionCookieName(userPoolId)}=`;
  return [
    ...new Set(
      (header?.split(";") ?? [])
        .map((part) => part.trim())
        .filter((part) => part.startsWith(name))
        .map((part) => part.slice(name.length))
        .filter((id) => /^[A-Za-z0-9_-]{43}$/.test(id)),
    ),
  ];
}
