import type { DeleteUserRequest } from "aws-sdk/clients/cognitoidentityserviceprovider";
import { InvalidParameterError, NotAuthorizedError } from "../errors";
import type { Services } from "../services";
import { isTokenRevoked, verifyToken } from "../services/tokenVerifier";
import type { Target } from "./Target";

export type DeleteUserTarget = Target<DeleteUserRequest, object>;

type DeleteUserServices = Pick<Services, "cognito" | "config">;

export const DeleteUser =
  ({ cognito, config }: DeleteUserServices): DeleteUserTarget =>
  async (ctx, req) => {
    const decodedToken = (() => {
      try {
        return verifyToken(
          req.AccessToken,
          config.TokenConfig.VerifyTokens ?? false,
        );
      } catch {
        ctx.logger.info("Unable to verify token");
        throw new InvalidParameterError();
      }
    })();

    const userPool = await cognito.getUserPoolForClientId(
      ctx,
      decodedToken.client_id,
    );
    const user = await userPool.getUserByUsername(ctx, decodedToken.sub);
    if (!user) {
      throw new NotAuthorizedError();
    }

    if (isTokenRevoked(decodedToken, user.RevokedRefreshTokenJtis ?? [])) {
      throw new NotAuthorizedError();
    }

    await userPool.deleteUser(ctx, user);

    return {};
  };
