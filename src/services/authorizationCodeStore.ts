const CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface AuthorizationCodeData {
  clientId: string;
  redirectUri: string;
  userPoolId: string;
  username: string;
  scopes: string[];
  codeChallenge?: string;
  codeChallengeMethod?: string;
  nonce?: string;
}

export interface AuthorizationCodeStore {
  save(code: string, data: AuthorizationCodeData): void;
  consume(code: string): AuthorizationCodeData | null;
}

interface StoredCode {
  data: AuthorizationCodeData;
  expiresAt: number;
}

export class InMemoryAuthorizationCodeStore implements AuthorizationCodeStore {
  private readonly codes = new Map<string, StoredCode>();

  save(code: string, data: AuthorizationCodeData): void {
    this.codes.set(code, {
      data,
      expiresAt: Date.now() + CODE_TTL_MS,
    });
  }

  consume(code: string): AuthorizationCodeData | null {
    const entry = this.codes.get(code);
    if (!entry) return null;

    this.codes.delete(code);

    if (Date.now() > entry.expiresAt) return null;

    return entry.data;
  }
}
