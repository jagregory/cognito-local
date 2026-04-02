import type {
  RevokeTokenRequest,
  RevokeTokenResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import jwt from "jsonwebtoken";
import { NotAuthorizedError } from "../errors";
import type { Services } from "../services";
import type { Target } from "./Target";

export type RevokeTokenTarget = Target<RevokeTokenRequest, RevokeTokenResponse>;

type RevokeTokenServices = Pick<Services, "cognito">;

export const RevokeToken =
  ({ cognito }: RevokeTokenServices): RevokeTokenTarget =>
  async (ctx, req) => {
    const appClient = await cognito.getAppClient(ctx, req.ClientId);
    if (!appClient) {
      throw new NotAuthorizedError();
    }

    // If the app client has a secret, the caller must provide the matching secret
    if (appClient.ClientSecret) {
      if (!req.ClientSecret || req.ClientSecret !== appClient.ClientSecret) {
        throw new NotAuthorizedError();
      }
    }

    const userPool = await cognito.getUserPoolForClientId(ctx, req.ClientId);
    const users = await userPool.listUsers(ctx);
    const user = users.find(
      (user) =>
        Array.isArray(user.RefreshTokens) &&
        user.RefreshTokens.includes(req.Token),
    );

    // Real Cognito returns success even if the token doesn't exist
    if (!user) {
      return {};
    }

    const tokens = Array.isArray(user.RefreshTokens) ? user.RefreshTokens : [];
    const tokenIndex = tokens.indexOf(req.Token);

    if (tokenIndex !== -1) {
      tokens.splice(tokenIndex, 1);
    }

    // Extract the jti from the refresh token so we can invalidate
    // access/id tokens that were issued with this origin_jti
    const revokedJtis = user.RevokedRefreshTokenJtis ?? [];
    const decoded = jwt.decode(req.Token) as { jti?: string } | null;
    if (decoded?.jti) {
      revokedJtis.push(decoded.jti);
    }

    await userPool.saveUser(ctx, {
      ...user,
      RefreshTokens: [...tokens],
      RevokedRefreshTokenJtis: revokedJtis,
    });

    return {};
  };
