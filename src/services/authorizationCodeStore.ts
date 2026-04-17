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
  // Non-destructive lookup — returns code data without deleting it. Use this
  // to validate redirect_uri / PKCE / client authentication before consuming,
  // so a bad verifier cannot be used to invalidate a legitimate code.
  lookup(code: string): AuthorizationCodeData | null;
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

  lookup(code: string): AuthorizationCodeData | null {
    const entry = this.codes.get(code);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.codes.delete(code);
      return null;
    }
    return entry.data;
  }

  consume(code: string): AuthorizationCodeData | null {
    const entry = this.codes.get(code);
    if (!entry) return null;

    this.codes.delete(code);

    if (Date.now() > entry.expiresAt) return null;

    return entry.data;
  }
}
