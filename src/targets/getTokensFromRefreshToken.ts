import jwt from "jsonwebtoken";
import { NotAuthorizedError } from "../errors";
import type { Services } from "../services";
import { verifyRefreshToken } from "../services/tokenVerifier";
import type { Target } from "./Target";

interface GetTokensFromRefreshTokenRequest {
  ClientId: string;
  RefreshToken: string;
  ClientSecret?: string;
  DeviceKey?: string;
  ClientMetadata?: Record<string, string>;
}

interface GetTokensFromRefreshTokenResponse {
  AuthenticationResult: {
    AccessToken: string;
    IdToken: string;
    RefreshToken?: string;
    TokenType?: string;
    ExpiresIn?: number;
  };
}

export type GetTokensFromRefreshTokenTarget = Target<
  GetTokensFromRefreshTokenRequest,
  GetTokensFromRefreshTokenResponse
>;

type GetTokensFromRefreshTokenServices = Pick<
  Services,
  "cognito" | "config" | "tokenGenerator"
>;

export const GetTokensFromRefreshToken =
  ({
    cognito,
    config,
    tokenGenerator,
  }: GetTokensFromRefreshTokenServices): GetTokensFromRefreshTokenTarget =>
  async (ctx, req) => {
    const appClient = await cognito.getAppClient(ctx, req.ClientId);
    if (!appClient) {
      throw new NotAuthorizedError();
    }

    if (appClient.ClientSecret) {
      if (!req.ClientSecret || req.ClientSecret !== appClient.ClientSecret) {
        throw new NotAuthorizedError();
      }
    }

    if (
      config.TokenConfig.VerifyTokens &&
      !verifyRefreshToken(req.RefreshToken)
    ) {
      throw new NotAuthorizedError();
    }

    const userPool = await cognito.getUserPoolForClientId(ctx, req.ClientId);
    const user = await userPool.getUserByRefreshToken(ctx, req.RefreshToken);
    if (!user) {
      throw new NotAuthorizedError();
    }

    // Check if the refresh token's jti has been revoked
    const decoded = jwt.decode(req.RefreshToken) as { jti?: string } | null;
    if (
      decoded?.jti &&
      (user.RevokedRefreshTokenJtis ?? []).includes(decoded.jti)
    ) {
      throw new NotAuthorizedError();
    }

    const userGroups = await userPool.listUserGroupMembership(ctx, user);

    const tokens = await tokenGenerator.generate(
      ctx,
      user,
      userGroups,
      appClient,
      req.ClientMetadata,
      "RefreshTokens",
    );

    return {
      AuthenticationResult: {
        AccessToken: tokens.AccessToken,
        IdToken: tokens.IdToken,
        RefreshToken: undefined,
        TokenType: "Bearer",
        ExpiresIn: undefined,
      },
    };
  };
