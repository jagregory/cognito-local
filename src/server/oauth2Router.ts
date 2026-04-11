import * as crypto from "node:crypto";
import { Router as ExpressRouter } from "express";
import * as jwt from "jsonwebtoken";
import PublicKey from "../keys/cognitoLocal.public.json";
import type { Services } from "../services";
import type { AppClient } from "../services/appClient";
import { attributeValue } from "../services/userPoolService";

export const createOAuth2Router = (services: Services): ExpressRouter => {
  const router = ExpressRouter();

  // GET /oauth2/authorize — show login form or redirect
  router.get("/oauth2/authorize", async (req, res) => {
    const {
      client_id,
      redirect_uri,
      response_type,
      scope,
      state,
      code_challenge,
      code_challenge_method,
      nonce,
    } = req.query as Record<string, string>;

    if (!client_id) {
      res
        .status(400)
        .json({
          error: "invalid_request",
          error_description: "client_id is required",
        });
      return;
    }
    if (response_type !== "code") {
      res
        .status(400)
        .json({
          error: "unsupported_response_type",
          error_description: "Only code response type is supported",
        });
      return;
    }

    let userPoolClient: AppClient | null;
    try {
      userPoolClient = await services.cognito.getAppClient(
        { logger: req.log },
        client_id,
      );
    } catch {
      userPoolClient = null;
    }

    if (!userPoolClient) {
      res
        .status(400)
        .json({ error: "invalid_client", error_description: "Unknown client" });
      return;
    }

    if (redirect_uri && userPoolClient.CallbackURLs?.length) {
      if (!userPoolClient.CallbackURLs.includes(redirect_uri)) {
        res
          .status(400)
          .json({
            error: "invalid_request",
            error_description: "redirect_uri mismatch",
          });
        return;
      }
    }

    // Render minimal login form
    res.type("html").send(`<!DOCTYPE html>
<html><head><title>Sign In</title>
<style>body{font-family:system-ui;max-width:400px;margin:80px auto;padding:20px}
input{width:100%;padding:8px;margin:6px 0;box-sizing:border-box}
button{width:100%;padding:10px;margin-top:12px;background:#FF6B35;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:16px}</style>
</head><body>
<h2>Sign In</h2>
<form method="POST" action="/oauth2/authorize">
<input type="hidden" name="client_id" value="${client_id ?? ""}"/>
<input type="hidden" name="redirect_uri" value="${redirect_uri ?? ""}"/>
<input type="hidden" name="response_type" value="${response_type ?? ""}"/>
<input type="hidden" name="scope" value="${scope ?? ""}"/>
<input type="hidden" name="state" value="${state ?? ""}"/>
<input type="hidden" name="code_challenge" value="${code_challenge ?? ""}"/>
<input type="hidden" name="code_challenge_method" value="${code_challenge_method ?? ""}"/>
<input type="hidden" name="nonce" value="${nonce ?? ""}"/>
<label>Username<input type="text" name="username" required/></label>
<label>Password<input type="password" name="password" required/></label>
<button type="submit">Sign In</button>
</form></body></html>`);
  });

  // POST /oauth2/authorize — authenticate and redirect with code
  router.post("/oauth2/authorize", async (req, res) => {
    const {
      client_id,
      redirect_uri,
      scope,
      state,
      code_challenge,
      code_challenge_method,
      nonce,
      username,
      password,
    } = req.body;

    if (!client_id || !username || !password) {
      res.status(400).json({ error: "invalid_request" });
      return;
    }

    let userPoolClient: AppClient | null;
    try {
      userPoolClient = await services.cognito.getAppClient(
        { logger: req.log },
        client_id,
      );
    } catch {
      userPoolClient = null;
    }

    if (!userPoolClient) {
      res.status(400).json({ error: "invalid_client" });
      return;
    }

    const userPool = await services.cognito.getUserPoolForClientId(
      { logger: req.log },
      client_id,
    );

    const user = await userPool.getUserByUsername(
      { logger: req.log },
      username,
    );
    if (!user || user.Password !== password) {
      // Re-render form with error
      res
        .status(401)
        .type("html")
        .send(`<!DOCTYPE html>
<html><head><title>Sign In</title>
<style>body{font-family:system-ui;max-width:400px;margin:80px auto;padding:20px}
input{width:100%;padding:8px;margin:6px 0;box-sizing:border-box}
button{width:100%;padding:10px;margin-top:12px;background:#FF6B35;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:16px}
.error{color:red;margin-bottom:10px}</style>
</head><body>
<h2>Sign In</h2>
<p class="error">Incorrect username or password.</p>
<form method="POST" action="/oauth2/authorize">
<input type="hidden" name="client_id" value="${client_id}"/>
<input type="hidden" name="redirect_uri" value="${redirect_uri ?? ""}"/>
<input type="hidden" name="response_type" value="code"/>
<input type="hidden" name="scope" value="${scope ?? ""}"/>
<input type="hidden" name="state" value="${state ?? ""}"/>
<input type="hidden" name="code_challenge" value="${code_challenge ?? ""}"/>
<input type="hidden" name="code_challenge_method" value="${code_challenge_method ?? ""}"/>
<input type="hidden" name="nonce" value="${nonce ?? ""}"/>
<label>Username<input type="text" name="username" required/></label>
<label>Password<input type="password" name="password" required/></label>
<button type="submit">Sign In</button>
</form></body></html>`);
      return;
    }

    const code = crypto.randomUUID();
    const scopes = (scope ?? "openid").split(" ");

    services.authorizationCodeStore.save(code, {
      clientId: client_id,
      redirectUri: redirect_uri,
      userPoolId: userPoolClient.UserPoolId,
      username: user.Username,
      scopes,
      codeChallenge: code_challenge,
      codeChallengeMethod: code_challenge_method,
      nonce,
    });

    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.set("code", code);
    if (state) {
      redirectUrl.searchParams.set("state", state);
    }

    res.redirect(302, redirectUrl.toString());
  });

  // POST /oauth2/token — exchange code or refresh token for tokens
  router.post("/oauth2/token", async (req, res) => {
    const { grant_type } = req.body;

    if (grant_type === "authorization_code") {
      await handleAuthorizationCodeGrant(req, res, services);
    } else if (grant_type === "refresh_token") {
      await handleRefreshTokenGrant(req, res, services);
    } else {
      res.status(400).json({ error: "unsupported_grant_type" });
    }
  });

  // GET /oauth2/userInfo — return OIDC claims
  router.get("/oauth2/userInfo", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "invalid_token" });
      return;
    }

    const token = authHeader.slice(7);

    let decoded: jwt.JwtPayload;
    try {
      decoded = jwt.verify(token, PublicKey.pem, {
        algorithms: ["RS256"],
      }) as jwt.JwtPayload;
    } catch {
      res.status(401).json({ error: "invalid_token" });
      return;
    }

    const userPoolId = decoded.iss?.split("/").pop();
    if (!userPoolId) {
      res.status(401).json({ error: "invalid_token" });
      return;
    }

    const userPool = await services.cognito.getUserPool(
      { logger: req.log },
      userPoolId,
    );
    const user = await userPool.getUserByUsername(
      { logger: req.log },
      decoded["username"] ?? decoded.sub ?? "",
    );

    if (!user) {
      res.status(404).json({ error: "user_not_found" });
      return;
    }

    const claims: Record<string, string | boolean> = {
      sub: attributeValue("sub", user.Attributes) ?? user.Username,
    };

    // Scope-based claim filtering
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
      if (phoneVerified)
        claims.phone_number_verified = phoneVerified === "true";
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

    // Include custom attributes
    for (const attr of user.Attributes) {
      if (attr.Name.startsWith("custom:") && attr.Value !== undefined) {
        claims[attr.Name] = attr.Value;
      }
    }

    claims.username = user.Username;

    res.json(claims);
  });

  // POST /oauth2/revoke — revoke refresh token
  router.post("/oauth2/revoke", async (req, res) => {
    const { token, client_id } = req.body;

    if (!token || !client_id) {
      res.status(400).json({ error: "invalid_request" });
      return;
    }

    let userPoolClient: AppClient | null;
    try {
      userPoolClient = await services.cognito.getAppClient(
        { logger: req.log },
        client_id,
      );
    } catch {
      userPoolClient = null;
    }

    if (!userPoolClient) {
      res.status(400).json({ error: "invalid_client" });
      return;
    }

    const userPool = await services.cognito.getUserPoolForClientId(
      { logger: req.log },
      client_id,
    );
    const user = await userPool.getUserByRefreshToken(
      { logger: req.log },
      token,
    );

    if (user) {
      await userPool.saveUser(
        { logger: req.log },
        {
          ...user,
          RefreshTokens: (user.RefreshTokens ?? []).filter((t) => t !== token),
        },
      );
    }

    res.status(200).json({});
  });

  // GET /logout — redirect to logout URI
  router.get("/logout", async (req, res) => {
    const { client_id, logout_uri } = req.query as Record<string, string>;

    if (!client_id || !logout_uri) {
      res
        .status(400)
        .json({
          error: "invalid_request",
          error_description: "client_id and logout_uri are required",
        });
      return;
    }

    let userPoolClient: AppClient | null;
    try {
      userPoolClient = await services.cognito.getAppClient(
        { logger: req.log },
        client_id,
      );
    } catch {
      userPoolClient = null;
    }

    if (!userPoolClient) {
      res.status(400).json({ error: "invalid_client" });
      return;
    }

    if (
      userPoolClient.LogoutURLs?.length &&
      !userPoolClient.LogoutURLs.includes(logout_uri)
    ) {
      res
        .status(400)
        .json({
          error: "invalid_request",
          error_description: "logout_uri not registered",
        });
      return;
    }

    res.redirect(302, logout_uri);
  });

  return router;
};

async function handleAuthorizationCodeGrant(
  req: any,
  res: any,
  services: Services,
): Promise<void> {
  const { code, redirect_uri, client_id, code_verifier } = req.body;

  if (!code) {
    res
      .status(400)
      .json({
        error: "invalid_request",
        error_description: "code is required",
      });
    return;
  }

  const codeData = services.authorizationCodeStore.consume(code);
  if (!codeData) {
    res
      .status(400)
      .json({
        error: "invalid_grant",
        error_description: "Invalid or expired authorization code",
      });
    return;
  }

  // Validate redirect_uri matches
  if (
    redirect_uri &&
    codeData.redirectUri &&
    redirect_uri !== codeData.redirectUri
  ) {
    res
      .status(400)
      .json({
        error: "invalid_grant",
        error_description: "redirect_uri mismatch",
      });
    return;
  }

  // PKCE validation
  if (codeData.codeChallenge) {
    if (!code_verifier) {
      res
        .status(400)
        .json({
          error: "invalid_grant",
          error_description: "code_verifier is required",
        });
      return;
    }

    const expectedChallenge = crypto
      .createHash("sha256")
      .update(code_verifier)
      .digest("base64url");

    if (expectedChallenge !== codeData.codeChallenge) {
      res
        .status(400)
        .json({
          error: "invalid_grant",
          error_description: "PKCE code_verifier validation failed",
        });
      return;
    }
  }

  // Authenticate client if secret exists
  const resolvedClientId = client_id ?? codeData.clientId;
  let userPoolClient: AppClient | null;
  try {
    userPoolClient = await services.cognito.getAppClient(
      { logger: req.log },
      resolvedClientId,
    );
  } catch {
    userPoolClient = null;
  }

  if (!userPoolClient) {
    res.status(400).json({ error: "invalid_client" });
    return;
  }

  if (userPoolClient.ClientSecret) {
    const authHeader = req.headers.authorization;
    let clientSecret: string | undefined;

    if (authHeader?.startsWith("Basic ")) {
      const decoded = Buffer.from(authHeader.slice(6), "base64").toString();
      const parts = decoded.split(":");
      clientSecret = parts[1];
    } else {
      clientSecret = req.body.client_secret;
    }

    if (clientSecret !== userPoolClient.ClientSecret) {
      res.status(401).json({ error: "invalid_client" });
      return;
    }
  }

  const userPool = await services.cognito.getUserPool(
    { logger: req.log },
    codeData.userPoolId,
  );
  const user = await userPool.getUserByUsername(
    { logger: req.log },
    codeData.username,
  );

  if (!user) {
    res.status(400).json({ error: "invalid_grant" });
    return;
  }

  const userGroups = await userPool.listUserGroupMembership(
    { logger: req.log },
    user,
  );

  const tokens = await services.tokenGenerator.generate(
    { logger: req.log },
    user,
    userGroups,
    userPoolClient,
    undefined,
    "HostedAuth",
  );

  await userPool.storeRefreshToken(
    { logger: req.log },
    tokens.RefreshToken,
    user,
  );

  res.json({
    access_token: tokens.AccessToken,
    id_token: tokens.IdToken,
    refresh_token: tokens.RefreshToken,
    token_type: "Bearer",
    expires_in: 3600,
  });
}

async function handleRefreshTokenGrant(
  req: any,
  res: any,
  services: Services,
): Promise<void> {
  const { refresh_token, client_id } = req.body;

  if (!refresh_token || !client_id) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }

  let userPoolClient: AppClient | null;
  try {
    userPoolClient = await services.cognito.getAppClient(
      { logger: req.log },
      client_id,
    );
  } catch {
    userPoolClient = null;
  }

  if (!userPoolClient) {
    res.status(400).json({ error: "invalid_client" });
    return;
  }

  const userPool = await services.cognito.getUserPoolForClientId(
    { logger: req.log },
    client_id,
  );
  const user = await userPool.getUserByRefreshToken(
    { logger: req.log },
    refresh_token,
  );

  if (!user) {
    res.status(400).json({ error: "invalid_grant" });
    return;
  }

  const userGroups = await userPool.listUserGroupMembership(
    { logger: req.log },
    user,
  );

  const tokens = await services.tokenGenerator.generate(
    { logger: req.log },
    user,
    userGroups,
    userPoolClient,
    undefined,
    "RefreshTokens",
  );

  res.json({
    access_token: tokens.AccessToken,
    id_token: tokens.IdToken,
    token_type: "Bearer",
    expires_in: 3600,
  });
}
