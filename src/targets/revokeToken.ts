import type {
  RevokeTokenRequest,
  RevokeTokenResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { NotAuthorizedError } from "../errors";
import type { Services } from "../services";
import type { Target } from "./Target";

export type RevokeTokenTarget = Target<RevokeTokenRequest, RevokeTokenResponse>;

type RevokeTokenServices = Pick<Services, "cognito">;

export const RevokeToken =
  ({ cognito }: RevokeTokenServices): RevokeTokenTarget =>
  async (ctx, req) => {
    const userPool = await cognito.getUserPoolForClientId(ctx, req.ClientId);

    const users = await userPool.listUsers(ctx);
    const user = users.find(
      (user) =>
        Array.isArray(user.RefreshTokens) &&
        user.RefreshTokens.includes(req.Token),
    );

    if (!user) {
      throw new NotAuthorizedError();
    }

    const tokens = Array.isArray(user.RefreshTokens) ? user.RefreshTokens : [];
    const tokenIndex = tokens.indexOf(req.Token);

    if (tokenIndex !== -1) {
      tokens.splice(tokenIndex, 1);
    }

    await userPool.saveUser(ctx, {
      ...user,
      RefreshTokens: [...tokens],
    });

    return {};
  };
