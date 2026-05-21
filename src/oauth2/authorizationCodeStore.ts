import * as uuid from "uuid";

const TTL_MS = 5 * 60 * 1000;

export interface StoredCode {
  clientId: string;
  userPoolId: string;
  username: string;
  redirectUri: string;
  codeChallenge: string;
  scope: string;
  state: string | undefined;
}

interface Entry extends StoredCode {
  expiresAt: number;
}

export class AuthorizationCodeStore {
  private readonly codes = new Map<string, Entry>();

  create(data: StoredCode): string {
    const code = uuid.v4();
    this.codes.set(code, { ...data, expiresAt: Date.now() + TTL_MS });
    return code;
  }

  consume(code: string): StoredCode | null {
    const entry = this.codes.get(code);
    if (!entry) return null;
    this.codes.delete(code);
    if (Date.now() > entry.expiresAt) return null;
    const { expiresAt: _, ...data } = entry;
    return data;
  }
}
