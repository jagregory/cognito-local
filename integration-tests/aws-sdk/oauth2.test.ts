import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { withCognitoSdk } from "./setup";

function pkceChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

async function getForm(
  url: string,
  params: Record<string, string>,
): Promise<Response> {
  const qs = new URLSearchParams(params).toString();
  return fetch(`${url}/oauth2/authorize?${qs}`);
}

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
  "OAuth2 PKCE authorization code flow",
  withCognitoSdk((Cognito, { serverUrl }) => {
    it("completes the full PKCE flow and returns valid tokens", async () => {
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
        })
        .promise();
      const clientId = upc.UserPoolClient!.ClientId!;

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

      const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
      const challenge = pkceChallenge(verifier);
      const state = "test-state-xyz";

      // Step 1: GET /oauth2/authorize — should return the login form
      const formRes = await getForm(serverUrl(), {
        client_id: clientId,
        redirect_uri: "http://localhost:9876",
        response_type: "code",
        code_challenge: challenge,
        code_challenge_method: "S256",
        scope: "openid email",
        state,
      });

      expect(formRes.status).toBe(200);
      expect(formRes.headers.get("content-type")).toMatch(/html/);
      const html = await formRes.text();
      expect(html).toContain('name="username"');
      expect(html).toContain('name="password"');

      // Step 2: POST /oauth2/authorize — submit credentials, should redirect with code
      const loginRes = await submitLogin(serverUrl(), {
        client_id: clientId,
        redirect_uri: "http://localhost:9876",
        response_type: "code",
        code_challenge: challenge,
        code_challenge_method: "S256",
        scope: "openid email",
        state,
        username: "testuser",
        password: "Password1!",
      });

      expect(loginRes.status).toBe(302);
      const location = loginRes.headers.get("location")!;
      const redirectUrl = new URL(location);
      expect(redirectUrl.hostname).toBe("localhost");
      expect(redirectUrl.port).toBe("9876");
      expect(redirectUrl.searchParams.get("state")).toBe(state);
      const code = redirectUrl.searchParams.get("code");
      expect(code).toBeTruthy();

      // Step 3: POST /oauth2/token — exchange code for tokens
      const tokenRes = await exchangeCode(serverUrl(), {
        grant_type: "authorization_code",
        code: code!,
        redirect_uri: "http://localhost:9876",
        client_id: clientId,
        code_verifier: verifier,
      });

      expect(tokenRes.status).toBe(200);
      const tokens = await tokenRes.json();
      expect(tokens.access_token).toBeTruthy();
      expect(tokens.id_token).toBeTruthy();
      expect(tokens.refresh_token).toBeTruthy();
      expect(tokens.token_type).toBe("Bearer");
      expect(tokens.expires_in).toBe(3600);
    });

    it("returns the login form again with an error message on wrong password", async () => {
      const client = Cognito();

      const pool = await client.createUserPool({ PoolName: "test" }).promise();
      const userPoolId = pool.UserPool!.Id!;

      const upc = await client
        .createUserPoolClient({
          UserPoolId: userPoolId,
          ClientName: "test",
          AllowedOAuthFlows: ["code"],
          AllowedOAuthScopes: ["openid"],
          CallbackURLs: ["http://localhost:9876"],
        })
        .promise();
      const clientId = upc.UserPoolClient!.ClientId!;

      await client
        .adminCreateUser({
          UserPoolId: userPoolId,
          Username: "testuser",
          TemporaryPassword: "Temp1234!",
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

      const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
      const challenge = pkceChallenge(verifier);

      const loginRes = await submitLogin(serverUrl(), {
        client_id: clientId,
        redirect_uri: "http://localhost:9876",
        response_type: "code",
        code_challenge: challenge,
        code_challenge_method: "S256",
        scope: "openid",
        state: "s1",
        username: "testuser",
        password: "WrongPassword!",
      });

      expect(loginRes.status).toBe(200);
      const html = await loginRes.text();
      expect(html).toContain("Incorrect username or password");
    });

    it("rejects an authorization code used twice", async () => {
      const client = Cognito();

      const pool = await client.createUserPool({ PoolName: "test" }).promise();
      const userPoolId = pool.UserPool!.Id!;

      const upc = await client
        .createUserPoolClient({
          UserPoolId: userPoolId,
          ClientName: "test",
          AllowedOAuthFlows: ["code"],
          AllowedOAuthScopes: ["openid"],
          CallbackURLs: ["http://localhost:9876"],
        })
        .promise();
      const clientId = upc.UserPoolClient!.ClientId!;

      await client
        .adminCreateUser({
          UserPoolId: userPoolId,
          Username: "testuser",
          TemporaryPassword: "Temp1234!",
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

      const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
      const challenge = pkceChallenge(verifier);

      const loginRes = await submitLogin(serverUrl(), {
        client_id: clientId,
        redirect_uri: "http://localhost:9876",
        response_type: "code",
        code_challenge: challenge,
        code_challenge_method: "S256",
        scope: "openid",
        state: "",
        username: "testuser",
        password: "Password1!",
      });

      const code = new URL(loginRes.headers.get("location")!).searchParams.get(
        "code",
      )!;

      const tokenBody = {
        grant_type: "authorization_code",
        code,
        redirect_uri: "http://localhost:9876",
        client_id: clientId,
        code_verifier: verifier,
      };

      const first = await exchangeCode(serverUrl(), tokenBody);
      expect(first.status).toBe(200);

      const second = await exchangeCode(serverUrl(), tokenBody);
      expect(second.status).toBe(400);
      expect((await second.json()).error).toBe("invalid_grant");
    });

    it("exchanges a refresh token for new access and id tokens", async () => {
      const client = Cognito();

      const pool = await client.createUserPool({ PoolName: "test" }).promise();
      const userPoolId = pool.UserPool!.Id!;

      const upc = await client
        .createUserPoolClient({
          UserPoolId: userPoolId,
          ClientName: "test",
          AllowedOAuthFlows: ["code"],
          AllowedOAuthScopes: ["openid"],
          CallbackURLs: ["http://localhost:9876"],
        })
        .promise();
      const clientId = upc.UserPoolClient!.ClientId!;

      await client
        .adminCreateUser({
          UserPoolId: userPoolId,
          Username: "testuser",
          TemporaryPassword: "Temp1234!",
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

      const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
      const challenge = pkceChallenge(verifier);

      const loginRes = await submitLogin(serverUrl(), {
        client_id: clientId,
        redirect_uri: "http://localhost:9876",
        response_type: "code",
        code_challenge: challenge,
        code_challenge_method: "S256",
        scope: "openid",
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
        code_verifier: verifier,
      });
      const { refresh_token } = await tokenRes.json();
      expect(refresh_token).toBeTruthy();

      // Use the refresh token
      const refreshRes = await exchangeCode(serverUrl(), {
        grant_type: "refresh_token",
        refresh_token,
        client_id: clientId,
      });

      expect(refreshRes.status).toBe(200);
      const refreshed = await refreshRes.json();
      expect(refreshed.access_token).toBeTruthy();
      expect(refreshed.id_token).toBeTruthy();
      expect(refreshed.refresh_token).toBeUndefined();
      expect(refreshed.token_type).toBe("Bearer");
    });

    it("rejects a request with an unregistered redirect_uri", async () => {
      const client = Cognito();

      const pool = await client.createUserPool({ PoolName: "test" }).promise();
      const userPoolId = pool.UserPool!.Id!;

      const upc = await client
        .createUserPoolClient({
          UserPoolId: userPoolId,
          ClientName: "test",
          AllowedOAuthFlows: ["code"],
          AllowedOAuthScopes: ["openid"],
          CallbackURLs: ["http://localhost:9876"],
        })
        .promise();
      const clientId = upc.UserPoolClient!.ClientId!;

      const res = await getForm(serverUrl(), {
        client_id: clientId,
        redirect_uri: "http://evil.com/callback",
        response_type: "code",
        code_challenge: pkceChallenge("verifier"),
        code_challenge_method: "S256",
        scope: "openid",
        state: "",
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("invalid_request");
    });
  }),
);
