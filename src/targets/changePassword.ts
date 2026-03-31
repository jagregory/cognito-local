import type {
  ChangePasswordRequest,
  ChangePasswordResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import {
  InvalidParameterError,
  InvalidPasswordError,
  NotAuthorizedError,
} from "../errors";
import type { Services } from "../services";
import { verifyToken } from "../services/tokenVerifier";
import type { Target } from "./Target";

export type ChangePasswordTarget = Target<
  ChangePasswordRequest,
  ChangePasswordResponse
>;

type ChangePasswordServices = Pick<Services, "cognito" | "clock" | "config">;

export const ChangePassword =
  ({ cognito, clock, config }: ChangePasswordServices): ChangePasswordTarget =>
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
    const user = await userPool.getUserByUsername(ctx, decodedToken.username);
    if (!user) {
      throw new NotAuthorizedError();
    }

    if (req.PreviousPassword !== user.Password) {
      throw new InvalidPasswordError();
    }

    await userPool.saveUser(ctx, {
      ...user,
      Password: req.ProposedPassword,
      UserLastModifiedDate: clock.get(),
    });

    return {};
  };
