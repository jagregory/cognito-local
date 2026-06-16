import { NotAuthorizedError } from "../errors";

// New API (2024/2025) — types not yet in aws-sdk
interface GetTokensFromRefreshTokenRequest {
  RefreshToken: string;
  ClientId: string;
  ClientSecret?: string;
}

interface GetTokensFromRefreshTokenResponse {
  AuthenticationResult?: {
    AccessToken?: string;
    IdToken?: string;
    ExpiresIn?: number;
    TokenType?: string;
  };
}

import type { Services } from "../services";
import type { Target } from "./Target";

export type GetTokensFromRefreshTokenTarget = Target<
  GetTokensFromRefreshTokenRequest,
  GetTokensFromRefreshTokenResponse
>;

type GetTokensFromRefreshTokenServices = Pick<
  Services,
  "cognito" | "tokenGenerator"
>;

export const GetTokensFromRefreshToken =
  ({
    cognito,
    tokenGenerator,
  }: GetTokensFromRefreshTokenServices): GetTokensFromRefreshTokenTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPoolForClientId(ctx, req.ClientId);
    const userPoolClient = await cognito.getAppClient(ctx, req.ClientId);

    const user = await userPool.getUserByRefreshToken(ctx, req.RefreshToken);
    if (!user || !userPoolClient) {
      throw new NotAuthorizedError();
    }

    const userGroups = await userPool.listUserGroupMembership(ctx, user);

    const tokens = await tokenGenerator.generate(
      ctx,
      user,
      userGroups,
      userPoolClient,
      undefined,
      "RefreshTokens",
    );

    return {
      AuthenticationResult: {
        AccessToken: tokens.AccessToken,
        IdToken: tokens.IdToken,
        ExpiresIn: 3600,
        TokenType: "Bearer",
      },
    };
  };
