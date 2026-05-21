import type { Application, Request, Response } from "express";
import type { Services } from "../services";
import type { Context } from "../services/context";
import type { AuthorizationCodeStore } from "./authorizationCodeStore";
import { verifyS256 } from "./pkce";

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
${params.error ? `<p style="color:red">${params.error}</p>` : ""}
<form method="POST" action="/oauth2/authorize">
  <input type="hidden" name="client_id" value="${params.clientId}" />
  <input type="hidden" name="redirect_uri" value="${params.redirectUri}" />
  <input type="hidden" name="response_type" value="code" />
  <input type="hidden" name="code_challenge" value="${params.codeChallenge}" />
  <input type="hidden" name="code_challenge_method" value="${params.codeChallengeMethod}" />
  <input type="hidden" name="scope" value="${params.scope}" />
  <input type="hidden" name="state" value="${params.state}" />
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
        return res
          .status(400)
          .json({
            error: "invalid_grant",
            error_description: "Authorization code expired or invalid",
          });
      }

      if (stored.clientId !== client_id) {
        return res
          .status(400)
          .json({
            error: "invalid_grant",
            error_description: "client_id mismatch",
          });
      }
      if (stored.redirectUri !== redirect_uri) {
        return res
          .status(400)
          .json({
            error: "invalid_grant",
            error_description: "redirect_uri mismatch",
          });
      }
      if (!verifyS256(code_verifier, stored.codeChallenge)) {
        return res
          .status(400)
          .json({
            error: "invalid_grant",
            error_description: "code_verifier does not match code_challenge",
          });
      }

      const appClient = await services.cognito.getAppClient(ctx, client_id);
      if (!appClient) {
        return res
          .status(400)
          .json({
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
        return res
          .status(400)
          .json({
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
        return res
          .status(400)
          .json({
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
        return res
          .status(400)
          .json({
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

    return res
      .status(400)
      .json({
        error: "unsupported_grant_type",
        error_description: `Unsupported grant_type: ${grant_type}`,
      });
  });
}
