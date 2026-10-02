import { createHash, randomBytes } from "node:crypto";
import { type Clock, DateClock } from "../services/clock";

export const LOGIN_REQUEST_TTL_MS = 10 * 60 * 1000;
const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const validId = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);

export interface LoginRequest {
  clientId: string;
  userPoolId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  scope: string;
  state: string;
}

/** Short-lived form transactions, never promoted to authenticated sessions. */
export class LoginRequestStore {
  private readonly requests = new Map<
    string,
    {
      browser: string;
      request: LoginRequest;
      expiresAt: number;
    }
  >();

  constructor(private readonly clock: Clock = new DateClock()) {}

  issue(request: LoginRequest) {
    this.prune();
    // Bound memory even if a client repeatedly fetches forms without submitting.
    const oldest = this.requests.keys().next().value;
    if (this.requests.size >= 1000 && oldest) this.requests.delete(oldest);
    const browser = randomBytes(32).toString("base64url");
    const token = randomBytes(32).toString("base64url");
    const expiresAt = this.clock.get().getTime() + LOGIN_REQUEST_TTL_MS;
    this.requests.set(digest(token), {
      browser: digest(browser),
      request: { ...request },
      expiresAt,
    });
    return { browser, token, expiresAt };
  }

  consume(
    token: unknown,
    browser: string | undefined,
    request: LoginRequest,
  ): boolean {
    this.prune();
    if (!validId(token) || !validId(browser)) return false;
    const key = digest(token);
    const entry = this.requests.get(key);
    if (
      !entry ||
      entry.browser !== digest(browser) ||
      (Object.keys(entry.request) as (keyof LoginRequest)[]).some(
        (key) => entry.request[key] !== request[key],
      )
    )
      return false;
    this.requests.delete(key);
    return true;
  }

  private prune(): void {
    const now = this.clock.get().getTime();
    for (const [key, entry] of this.requests) {
      if (entry.expiresAt <= now) this.requests.delete(key);
    }
  }
}
