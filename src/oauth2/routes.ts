import type { Application, Request, Response } from "express";
import * as jwt from "jsonwebtoken";
import PublicKey from "../keys/cognitoLocal.public.json";
import type { Services } from "../services";
import type { Context } from "../services/context";
import { attributeValue } from "../services/userPoolService";
import type { AuthorizationCodeStore } from "./authorizationCodeStore";
import { verifyS256 } from "./pkce";

// Escape untrusted values before interpolating them into HTML attribute
// contexts. Prevents reflected XSS via query params echoed into the login form
// (e.g. state/scope, which are attacker-controllable).
function escapeHtml(value: string | undefined): string {
  if (!value) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Extracts the presented client secret from either HTTP Basic auth or the
// request body (client_secret parameter), per RFC 6749 §2.3.1.
function extractClientSecret(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Basic ")) {
    const decoded = Buffer.from(authHeader.slice(6), "base64").toString();
    const idx = decoded.indexOf(":");
    return idx === -1 ? undefined : decoded.slice(idx + 1);
  }
  return (req.body as Record<string, string>)?.client_secret;
}

const LOGIN_FORM = (params: {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  scope: string;
  state: string;
  error?: string;
}) => `<!DOCTYPE html>
<html>
<head><title>Sign in</title></head>
<body>
${params.error ? `<p style="color:red">${escapeHtml(params.error)}</p>` : ""}
<form method="POST" action="/oauth2/authorize">
  <input type="hidden" name="client_id" value="${escapeHtml(params.clientId)}" />
  <input type="hidden" name="redirect_uri" value="${escapeHtml(params.redirectUri)}" />
  <input type="hidden" name="response_type" value="code" />
  <input type="hidden" name="code_challenge" value="${escapeHtml(params.codeChallenge)}" />
  <input type="hidden" name="code_challenge_method" value="${escapeHtml(params.codeChallengeMethod)}" />
  <input type="hidden" name="scope" value="${escapeHtml(params.scope)}" />
  <input type="hidden" name="state" value="${escapeHtml(params.state)}" />
  <label>Username: <input type="text" name="username" /></label><br />
  <label>Password: <input type="password" name="password" /></label><br />
  <button type="submit">Sign in</button>
</form>
</body>
</html>`;

function badRequest(res: Response, message: string) {
  res
    .status(400)
    .json({ error: "invalid_request", error_description: message });
}

export function attachOAuth2Routes(
  app: Application,
  services: Services,
  codeStore: AuthorizationCodeStore,
): void {
  app.get("/oauth2/authorize", async (req: Request, res: Response) => {
    const {
      client_id,
      redirect_uri,
      response_type,
      code_challenge,
      code_challenge_method,
      scope,
      state,
    } = req.query as Record<string, string>;

    if (!client_id) return badRequest(res, "Missing client_id");
    if (!redirect_uri) return badRequest(res, "Missing redirect_uri");
    if (response_type !== "code")
      return badRequest(res, "response_type must be code");
    if (!code_challenge) return badRequest(res, "Missing code_challenge");
    if (code_challenge_method !== "S256")
      return badRequest(res, "code_challenge_method must be S256");

    const ctx: Context = { logger: req.log };

    let appClient: Awaited<ReturnType<typeof services.cognito.getAppClient>>;
    try {
      appClient = await services.cognito.getAppClient(ctx, client_id);
    } catch {
      return badRequest(res, "Invalid client_id");
    }

    if (!appClient) return badRequest(res, "Invalid client_id");

    const allowedUrls = appClient.CallbackURLs ?? [];
    if (!allowedUrls.includes(redirect_uri)) {
      return badRequest(res, "redirect_uri not registered for this client");
    }

    res
      .status(200)
      .type("text/html")
      .send(
        LOGIN_FORM({
          clientId: client_id,
          redirectUri: redirect_uri,
          codeChallenge: code_challenge,
          codeChallengeMethod: code_challenge_method ?? "S256",
          scope: scope ?? "",
          state: state ?? "",
        }),
      );
  });

  app.post("/oauth2/authorize", async (req: Request, res: Response) => {
    const {
      client_id,
      redirect_uri,
      response_type,
      code_challenge,
      code_challenge_method,
      scope,
      state,
      username,
      password,
    } = req.body as Record<string, string>;

    if (
      !client_id ||
      !redirect_uri ||
      !code_challenge ||
      !username ||
      !password
    ) {
      return badRequest(res, "Missing required fields");
    }
    if (response_type !== "code")
      return badRequest(res, "response_type must be code");
    if (code_challenge_method !== "S256")
      return badRequest(res, "code_challenge_method must be S256");

    const ctx: Context = { logger: req.log };

    const appClient = await services.cognito.getAppClient(ctx, client_id);
    if (!appClient) return badRequest(res, "Invalid client_id");

    const allowedUrls = appClient.CallbackURLs ?? [];
    if (!allowedUrls.includes(redirect_uri)) {
      return badRequest(res, "redirect_uri not registered for this client");
    }

    let userPool: Awaited<
      ReturnType<typeof services.cognito.getUserPoolForClientId>
    >;
    try {
      userPool = await services.cognito.getUserPoolForClientId(ctx, client_id);
    } catch {
      return badRequest(res, "Invalid client_id");
    }

    const user = await userPool.getUserByUsername(ctx, username);

    if (
      !user ||
      user.Password !== password ||
      user.UserStatus === "UNCONFIRMED"
    ) {
      res
        .status(200)
        .type("text/html")
        .send(
          LOGIN_FORM({
            clientId: client_id,
            redirectUri: redirect_uri,
            codeChallenge: code_challenge,
            codeChallengeMethod: code_challenge_method ?? "S256",
            scope: scope ?? "",
            state: state ?? "",
            error: "Incorrect username or password.",
          }),
        );
      return;
    }

    const code = codeStore.create({
      clientId: client_id,
      userPoolId: userPool.options.Id,
      username: user.Username,
      redirectUri: redirect_uri,
      codeChallenge: code_challenge,
      scope: scope ?? "",
      state: state ?? undefined,
    });

    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.set("code", code);
    if (state) redirectUrl.searchParams.set("state", state);

    res.redirect(redirectUrl.toString());
  });

  app.post("/oauth2/token", async (req: Request, res: Response) => {
    const body = req.body as Record<string, string>;
    const { grant_type } = body;

    const ctx: Context = { logger: req.log };

    if (grant_type === "authorization_code") {
      const { code, redirect_uri, client_id, code_verifier } = body;

      if (!code) return badRequest(res, "Missing code");
      if (!redirect_uri) return badRequest(res, "Missing redirect_uri");
      if (!client_id) return badRequest(res, "Missing client_id");
      if (!code_verifier) return badRequest(res, "Missing code_verifier");

      const stored = codeStore.consume(code);
      if (!stored) {
        return res.status(400).json({
          error: "invalid_grant",
          error_description: "Authorization code expired or invalid",
        });
      }

      if (stored.clientId !== client_id) {
        return res.status(400).json({
          error: "invalid_grant",
          error_description: "client_id mismatch",
        });
      }
      if (stored.redirectUri !== redirect_uri) {
        return res.status(400).json({
          error: "invalid_grant",
          error_description: "redirect_uri mismatch",
        });
      }
      if (!verifyS256(code_verifier, stored.codeChallenge)) {
        return res.status(400).json({
          error: "invalid_grant",
          error_description: "code_verifier does not match code_challenge",
        });
      }

      const appClient = await services.cognito.getAppClient(ctx, client_id);
      if (!appClient) {
        return res.status(400).json({
          error: "invalid_client",
          error_description: "Unknown client",
        });
      }

      const userPool = await services.cognito.getUserPool(
        ctx,
        stored.userPoolId,
      );
      const user = await userPool.getUserByUsername(ctx, stored.username);
      if (!user) {
        return res.status(400).json({
          error: "invalid_grant",
          error_description: "User not found",
        });
      }

      const userGroups = await userPool.listUserGroupMembership(ctx, user);
      const tokens = await services.tokenGenerator.generate(
        ctx,
        user,
        userGroups,
        appClient,
        undefined,
        "HostedAuth",
      );

      await userPool.storeRefreshToken(ctx, tokens.RefreshToken, user);

      return res.status(200).json({
        access_token: tokens.AccessToken,
        id_token: tokens.IdToken,
        refresh_token: tokens.RefreshToken,
        token_type: "Bearer",
        expires_in: 3600,
      });
    }

    if (grant_type === "refresh_token") {
      const { refresh_token, client_id } = body;

      if (!refresh_token) return badRequest(res, "Missing refresh_token");
      if (!client_id) return badRequest(res, "Missing client_id");

      const appClient = await services.cognito.getAppClient(ctx, client_id);
      if (!appClient) {
        return res.status(400).json({
          error: "invalid_client",
          error_description: "Unknown client",
        });
      }

      const userPool = await services.cognito.getUserPoolForClientId(
        ctx,
        client_id,
      );
      const user = await userPool.getUserByRefreshToken(ctx, refresh_token);
      if (!user) {
        return res.status(400).json({
          error: "invalid_grant",
          error_description: "Invalid refresh token",
        });
      }

      const userGroups = await userPool.listUserGroupMembership(ctx, user);
      const tokens = await services.tokenGenerator.generate(
        ctx,
        user,
        userGroups,
        appClient,
        undefined,
        "RefreshTokens",
      );

      return res.status(200).json({
        access_token: tokens.AccessToken,
        id_token: tokens.IdToken,
        token_type: "Bearer",
        expires_in: 3600,
      });
    }

    return res.status(400).json({
      error: "unsupported_grant_type",
      error_description: `Unsupported grant_type: ${grant_type}`,
    });
  });

  // GET /oauth2/userInfo — return OIDC claims for a valid access token
  app.get("/oauth2/userInfo", async (req: Request, res: Response) => {
    const ctx: Context = { logger: req.log };

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "invalid_token" });
    }

    const token = authHeader.slice(7);

    let decoded: jwt.JwtPayload;
    try {
      const verified = jwt.verify(token, PublicKey.pem, {
        algorithms: ["RS256"],
      });
      if (typeof verified !== "object" || verified === null) {
        return res.status(401).json({ error: "invalid_token" });
      }
      decoded = verified as jwt.JwtPayload;
    } catch {
      return res.status(401).json({ error: "invalid_token" });
    }

    // Cognito's userInfo endpoint only accepts access tokens, not ID tokens.
    if (decoded.token_use !== "access") {
      return res.status(401).json({ error: "invalid_token" });
    }

    const userPoolId = decoded.iss?.split("/").pop();
    if (!userPoolId) {
      return res.status(401).json({ error: "invalid_token" });
    }

    const userPool = await services.cognito.getUserPool(ctx, userPoolId);
    const user = await userPool.getUserByUsername(
      ctx,
      decoded["username"] ?? decoded.sub ?? "",
    );
    if (!user) {
      return res.status(404).json({ error: "user_not_found" });
    }

    const claims: Record<string, string | boolean> = {
      sub: attributeValue("sub", user.Attributes) ?? user.Username,
    };

    const scope = decoded.scope ?? "";
    const scopes = typeof scope === "string" ? scope.split(" ") : [];

    if (scopes.includes("email") || scopes.includes("openid")) {
      const email = attributeValue("email", user.Attributes);
      if (email) claims.email = email;
      const emailVerified = attributeValue("email_verified", user.Attributes);
      if (emailVerified) claims.email_verified = emailVerified === "true";
    }

    if (scopes.includes("phone") || scopes.includes("openid")) {
      const phone = attributeValue("phone_number", user.Attributes);
      if (phone) claims.phone_number = phone;
      const phoneVerified = attributeValue(
        "phone_number_verified",
        user.Attributes,
      );
      if (phoneVerified) {
        claims.phone_number_verified = phoneVerified === "true";
      }
    }

    if (scopes.includes("profile")) {
      for (const attr of [
        "name",
        "family_name",
        "given_name",
        "middle_name",
        "nickname",
        "preferred_username",
        "profile",
        "picture",
        "website",
        "gender",
        "birthdate",
        "zoneinfo",
        "locale",
        "updated_at",
      ]) {
        const val = attributeValue(attr, user.Attributes);
        if (val) claims[attr] = val;
      }
    }

    for (const attr of user.Attributes) {
      if (attr.Name.startsWith("custom:") && attr.Value !== undefined) {
        claims[attr.Name] = attr.Value;
      }
    }

    claims.username = user.Username;

    return res.status(200).json(claims);
  });

  // POST /oauth2/revoke — revoke a refresh token
  app.post("/oauth2/revoke", async (req: Request, res: Response) => {
    const ctx: Context = { logger: req.log };
    const { token, client_id } = req.body as Record<string, string>;

    if (!token || !client_id) {
      return badRequest(res, "Missing token or client_id");
    }

    const appClient = await services.cognito.getAppClient(ctx, client_id);
    if (!appClient) {
      return res
        .status(400)
        .json({ error: "invalid_client", error_description: "Unknown client" });
    }

    // Confidential clients must authenticate before revoking tokens.
    if (appClient.ClientSecret) {
      const presented = extractClientSecret(req);
      if (presented !== appClient.ClientSecret) {
        return res.status(401).json({ error: "invalid_client" });
      }
    }

    const userPool = await services.cognito.getUserPoolForClientId(
      ctx,
      client_id,
    );
    const user = await userPool.getUserByRefreshToken(ctx, token);
    if (user) {
      await userPool.saveUser(ctx, {
        ...user,
        RefreshTokens: (user.RefreshTokens ?? []).filter((t) => t !== token),
      });
    }

    return res.status(200).json({});
  });

  // GET /logout — redirect to a registered logout URI (hosted UI logout)
  app.get("/logout", async (req: Request, res: Response) => {
    const ctx: Context = { logger: req.log };
    const { client_id, logout_uri } = req.query as Record<string, string>;

    if (!client_id || !logout_uri) {
      return badRequest(res, "Missing client_id or logout_uri");
    }

    const appClient = await services.cognito.getAppClient(ctx, client_id);
    if (!appClient) {
      return res
        .status(400)
        .json({ error: "invalid_client", error_description: "Unknown client" });
    }

    if (
      appClient.LogoutURLs?.length &&
      !appClient.LogoutURLs.includes(logout_uri)
    ) {
      return badRequest(res, "logout_uri not registered");
    }

    return res.redirect(logout_uri);
  });
}
