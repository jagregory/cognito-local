import {
  RevokeTokenRequest,
  RevokeTokenResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { NotAuthorizedError } from "../errors";
import { Services } from "../services";

export type RevokeTokenTarget = (
  req: RevokeTokenRequest
) => Promise<RevokeTokenResponse>;

export const RevokeToken =
  (services: Pick<Services, "cognito">): RevokeTokenTarget =>
  async (req) => {
    const userPool = await services.cognito.getUserPoolForClientId(
      req.ClientId
    );

    const users = await userPool.listUsers();
    const user = users.find(
      (user) =>
        Array.isArray(user.RefreshTokens) &&
        user.RefreshTokens.includes(req.Token)
    );

    if (!user) {
      throw new NotAuthorizedError();
    }

    const tokens = Array.isArray(user.RefreshTokens) ? user.RefreshTokens : [];
    const tokenIndex = tokens.indexOf(req.Token);

    if (tokenIndex !== -1) {
      tokens.splice(tokenIndex, 1);
    }

    userPool.saveUser({
      ...user,
      RefreshTokens: [...tokens],
    });

    return {};
  };
