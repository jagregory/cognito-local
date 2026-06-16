import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { withCognitoSdk } from "./setup";

// Integration coverage for the OIDC endpoints added on top of the core
// authorization-code + PKCE flow: GET /oauth2/userInfo, POST /oauth2/revoke,
// and GET /logout.

function pkceChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

const VERIFIER = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";

async function submitLogin(
  url: string,
  body: Record<string, string>,
): Promise<Response> {
  return fetch(`${url}/oauth2/authorize`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
    redirect: "manual",
  });
}

async function exchangeCode(
  url: string,
  body: Record<string, string>,
): Promise<Response> {
  return fetch(`${url}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });
}

describe(
  "OAuth2 OIDC extras (userInfo / revoke / logout)",
  withCognitoSdk((Cognito, { serverUrl }) => {
    // Creates a pool + confirmed user + app client, then runs the full PKCE
    // flow and returns the issued tokens plus identifiers used by the tests.
    async function setupAndAuthenticate(
      clientOverrides: Record<string, unknown> = {},
    ) {
      const client = Cognito();

      const pool = await client.createUserPool({ PoolName: "test" }).promise();
      const userPoolId = pool.UserPool!.Id!;

      const upc = await client
        .createUserPoolClient({
          UserPoolId: userPoolId,
          ClientName: "test",
          AllowedOAuthFlows: ["code"],
          AllowedOAuthScopes: ["openid", "email", "profile"],
          CallbackURLs: ["http://localhost:9876"],
          ...clientOverrides,
        })
        .promise();
      const clientId = upc.UserPoolClient!.ClientId!;
      const clientSecret = upc.UserPoolClient!.ClientSecret;

      await client
        .adminCreateUser({
          UserPoolId: userPoolId,
          Username: "testuser",
          TemporaryPassword: "Temp1234!",
          UserAttributes: [{ Name: "email", Value: "test@example.com" }],
          MessageAction: "SUPPRESS",
        })
        .promise();
      await client
        .adminSetUserPassword({
          UserPoolId: userPoolId,
          Username: "testuser",
          Password: "Password1!",
          Permanent: true,
        })
        .promise();

      const challenge = pkceChallenge(VERIFIER);

      const loginRes = await submitLogin(serverUrl(), {
        client_id: clientId,
        redirect_uri: "http://localhost:9876",
        response_type: "code",
        code_challenge: challenge,
        code_challenge_method: "S256",
        scope: "openid email",
        state: "",
        username: "testuser",
        password: "Password1!",
      });
      const code = new URL(loginRes.headers.get("location")!).searchParams.get(
        "code",
      )!;

      const tokenRes = await exchangeCode(serverUrl(), {
        grant_type: "authorization_code",
        code,
        redirect_uri: "http://localhost:9876",
        client_id: clientId,
        code_verifier: VERIFIER,
      });
      const tokens = await tokenRes.json();

      return { client, userPoolId, clientId, clientSecret, tokens };
    }

    describe("GET /oauth2/userInfo", () => {
      it("returns claims for a valid access token", async () => {
        const { tokens } = await setupAndAuthenticate();

        const res = await fetch(`${serverUrl()}/oauth2/userInfo`, {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        });

        expect(res.status).toBe(200);
        const claims = await res.json();
        expect(claims.sub).toBeTruthy();
        expect(claims.username).toBe("testuser");
      });

      it("rejects an ID token (token_use must be access)", async () => {
        const { tokens } = await setupAndAuthenticate();

        const res = await fetch(`${serverUrl()}/oauth2/userInfo`, {
          headers: { Authorization: `Bearer ${tokens.id_token}` },
        });

        expect(res.status).toBe(401);
        expect((await res.json()).error).toBe("invalid_token");
      });

      it("rejects a missing or malformed bearer token", async () => {
        const noHeader = await fetch(`${serverUrl()}/oauth2/userInfo`);
        expect(noHeader.status).toBe(401);

        const garbage = await fetch(`${serverUrl()}/oauth2/userInfo`, {
          headers: { Authorization: "Bearer not-a-jwt" },
        });
        expect(garbage.status).toBe(401);
      });
    });

    describe("POST /oauth2/revoke", () => {
      it("revokes a refresh token so it can no longer be exchanged", async () => {
        const { clientId, tokens } = await setupAndAuthenticate();
        expect(tokens.refresh_token).toBeTruthy();

        // Confirm the refresh token works before revocation.
        const before = await exchangeCode(serverUrl(), {
          grant_type: "refresh_token",
          refresh_token: tokens.refresh_token,
          client_id: clientId,
        });
        expect(before.status).toBe(200);

        const revokeRes = await fetch(`${serverUrl()}/oauth2/revoke`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            token: tokens.refresh_token,
            client_id: clientId,
          }).toString(),
        });
        expect(revokeRes.status).toBe(200);

        // After revocation the refresh token must be rejected.
        const after = await exchangeCode(serverUrl(), {
          grant_type: "refresh_token",
          refresh_token: tokens.refresh_token,
          client_id: clientId,
        });
        expect(after.status).toBe(400);
        expect((await after.json()).error).toBe("invalid_grant");
      });

      it("requires client authentication for a confidential client", async () => {
        const { clientId, clientSecret, tokens } = await setupAndAuthenticate({
          GenerateSecret: true,
        });
        expect(clientSecret).toBeTruthy();

        // Without the secret → 401.
        const unauthed = await fetch(`${serverUrl()}/oauth2/revoke`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            token: tokens.refresh_token,
            client_id: clientId,
          }).toString(),
        });
        expect(unauthed.status).toBe(401);
        expect((await unauthed.json()).error).toBe("invalid_client");

        // With the secret in the body → 200.
        const authed = await fetch(`${serverUrl()}/oauth2/revoke`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            token: tokens.refresh_token,
            client_id: clientId,
            client_secret: clientSecret!,
          }).toString(),
        });
        expect(authed.status).toBe(200);
      });
    });

    describe("GET /logout", () => {
      it("redirects to a registered logout_uri", async () => {
        const { clientId } = await setupAndAuthenticate({
          LogoutURLs: ["http://localhost:9876/logout"],
        });

        const res = await fetch(
          `${serverUrl()}/logout?${new URLSearchParams({
            client_id: clientId,
            logout_uri: "http://localhost:9876/logout",
          }).toString()}`,
          { redirect: "manual" },
        );

        expect(res.status).toBe(302);
        expect(res.headers.get("location")).toBe(
          "http://localhost:9876/logout",
        );
      });

      it("rejects an unregistered logout_uri", async () => {
        const { clientId } = await setupAndAuthenticate({
          LogoutURLs: ["http://localhost:9876/logout"],
        });

        const res = await fetch(
          `${serverUrl()}/logout?${new URLSearchParams({
            client_id: clientId,
            logout_uri: "http://evil.example/logout",
          }).toString()}`,
          { redirect: "manual" },
        );

        expect(res.status).toBe(400);
        expect((await res.json()).error).toBe("invalid_request");
      });
    });
  }),
);
